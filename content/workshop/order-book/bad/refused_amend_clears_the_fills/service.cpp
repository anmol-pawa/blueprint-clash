#include <algorithm>
#include <list>
#include <map>
#include <memory>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include "api_storm2.h"



// One order as the book holds it: what it is and how much is still unfilled. Only the unfilled quantity ever changes.
class Order {
 public:
  Order(int id, book::Side side, int price, int quantity) : id_(id), side_(side), price_(price), remaining_(quantity) {}

  int id() const { return id_; }
  book::Side side() const { return side_; }
  int price() const { return price_; }
  int remaining() const { return remaining_; }
  bool done() const { return remaining_ == 0; }
  void fill(int quantity) { remaining_ -= quantity; }
  void resize(int quantity) { remaining_ = quantity; }

 private:
  int id_;
  book::Side side_;
  int price_;
  int remaining_;
};

// What the interface accepts as an order; nothing else in the design repeats these limits.
class OrderRules {
 public:
  static bool valid(int id, int price, int quantity) { return id >= 1 && validTerms(price, quantity); }
  static bool validTerms(int price, int quantity) {
    return price >= 1 && price <= book::kMaxPrice && quantity >= 1 && quantity <= book::kMaxQuantity;
  }
};



// Which way "better" points on one side, and how a price becomes a map key so that the best price sorts first: sells by
// price, buys by its negation.
class PriceOrder {
 public:
  explicit PriceOrder(book::Side side) : side_(side) {}

  int keyOf(int price) const { return side_ == book::Side::Sell ? price : -price; }
  int priceOf(int key) const { return side_ == book::Side::Sell ? key : -key; }
  // Would an incoming order with this limit trade at `price` on this side?
  bool acceptable(int price, int limit) const { return side_ == book::Side::Sell ? price <= limit : price >= limit; }

 private:
  book::Side side_;
};

// All the resting orders of ONE side, grouped by price, each price a queue in arrival order. The map key is arranged so that
// the BEST price is always first: sells by price, buys by negated price. Nothing here knows how orders trade.
class HalfBook {
 public:
  using Queue = std::list<Order>;
  using Position = Queue::iterator;

  explicit HalfBook(book::Side side) : order_(side) {}

  bool empty() const { return levels_.empty(); }
  int bestPrice() const { return order_.priceOf(levels_.begin()->first); }
  Order& oldestAtBest() { return levels_.begin()->second.front(); }

  // True when an incoming order with this limit would trade with the best price here.
  bool crossedBy(int limit) const {
    return !empty() && order_.acceptable(bestPrice(), limit);
  }

  Position add(const Order& order) {
    Queue& queue = levels_[order_.keyOf(order.price())];
    queue.push_back(order);
    return std::prev(queue.end());
  }

  void remove(int price, Position position) {
    const auto level = levels_.find(order_.keyOf(price));
    level->second.erase(position);
    if (level->second.empty()) levels_.erase(level);
  }

  int depthAt(int price) const {
    const auto level = levels_.find(order_.keyOf(price));
    return level == levels_.end() ? 0 : total(level->second);
  }

  bool best(int& price, int& quantity) const {
    if (empty()) return false;
    price = bestPrice();
    quantity = total(levels_.begin()->second);
    return true;
  }

  // Quantity an incoming order with this limit could trade with, best price first, without changing anything.
  int availableFor(int limit) const {
    int sum = 0;
    for (const auto& [key, queue] : levels_) {
      if (!order_.acceptable(order_.priceOf(key), limit)) break;
      sum += total(queue);
    }
    return sum;
  }

 private:
  static int total(const Queue& queue) {
    int sum = 0;
    for (const Order& order : queue) sum += order.remaining();
    return sum;
  }

  PriceOrder order_;
  std::map<int, Queue> levels_;
};



// Every id ever accepted. An id is never reused, whatever became of its order.
class IdLedger {
 public:
  bool seen(int id) const { return used_.count(id) != 0; }
  void record(int id) { used_.insert(id); }

 private:
  std::unordered_set<int> used_;
};

// Where each RESTING order sits, so a cancel or an amend goes straight to it.
class RestingIndex {
 public:
  struct Handle {
    book::Side side;
    int price;
    HalfBook::Position position;
  };

  void add(int id, const Handle& handle) { where_.emplace(id, handle); }
  void forget(int id) { where_.erase(id); }
  const Handle* find(int id) const {
    const auto it = where_.find(id);
    return it == where_.end() ? nullptr : &it->second;
  }
  int count() const { return static_cast<int>(where_.size()); }

 private:
  std::unordered_map<int, Handle> where_;
};



// The two sides of the book and the one rule that moves orders between them: price-time priority.
class Sides {
 public:
  Sides() : bids_(book::Side::Buy), asks_(book::Side::Sell) {}

  HalfBook& own(book::Side side) { return side == book::Side::Buy ? bids_ : asks_; }
  const HalfBook& own(book::Side side) const { return side == book::Side::Buy ? bids_ : asks_; }
  HalfBook& other(book::Side side) { return own(side == book::Side::Buy ? book::Side::Sell : book::Side::Buy); }
  const HalfBook& other(book::Side side) const {
    return own(side == book::Side::Buy ? book::Side::Sell : book::Side::Buy);
  }

 private:
  HalfBook bids_;
  HalfBook asks_;
};

class Matcher {
 public:
  Matcher(Sides& sides, RestingIndex& index) : sides_(sides), index_(index) {}

  // Trades `taker` against the opposite side while the best price is acceptable, oldest order first, at the maker's price.
  void match(Order& taker, std::vector<book::Fill>& fills) {
    HalfBook& opposite = sides_.other(taker.side());
    while (!taker.done() && opposite.crossedBy(taker.price())) {
      Order& maker = opposite.oldestAtBest();
      const int traded = std::min(taker.remaining(), maker.remaining());
      fills.push_back(book::Fill{taker.id(), maker.id(), maker.price(), traded});
      taker.fill(traded);
      maker.fill(traded);
      if (maker.done()) retire(opposite, maker);
    }
  }

  // What an order like this could trade right now. Pure: nothing moves.
  int available(const Order& taker) const { return sides_.other(taker.side()).availableFor(taker.price()); }

 private:
  void retire(HalfBook& side, const Order& maker) {
    const RestingIndex::Handle* handle = index_.find(maker.id());
    const int id = maker.id();
    side.remove(handle->price, handle->position);
    index_.forget(id);
  }

  Sides& sides_;
  RestingIndex& index_;
};



// What an order does when it meets the book: may it start trading, and does the rest wait? One small class per rule.
class Disposition {
 public:
  virtual ~Disposition() = default;
  virtual bool mayTrade(const Matcher& matcher, const Order& order) const = 0;
  virtual bool restsRemainder() const = 0;
};

class GoodTillCancelled : public Disposition {
 public:
  bool mayTrade(const Matcher&, const Order&) const override { return true; }
  bool restsRemainder() const override { return true; }
};

class ImmediateOrCancel : public Disposition {
 public:
  bool mayTrade(const Matcher&, const Order&) const override { return true; }
  bool restsRemainder() const override { return false; }
};

class FillOrKill : public Disposition {
 public:
  bool mayTrade(const Matcher& matcher, const Order& order) const override {
    return matcher.available(order) >= order.remaining();
  }
  bool restsRemainder() const override { return false; }
};

class Dispositions {
 public:
  static const Disposition& of(book::TimeInForce tif) {
    static const GoodTillCancelled gtc;
    static const ImmediateOrCancel ioc;
    static const FillOrKill fok;
    switch (tif) {
      case book::TimeInForce::Ioc: return ioc;
      case book::TimeInForce::Fok: return fok;
      case book::TimeInForce::Gtc: break;
    }
    return gtc;
  }
};



// The facade the interface sees: validate, record the id, let the matcher trade, rest what is left. It owns no rule itself.
class BookImpl : public book::AmendBook {
 public:
  BookImpl() : matcher_(sides_, index_) {}

  book::Status submit(int id, book::Side side, int price, int quantity, std::vector<book::Fill>& fills) override {
    return submitWith(id, side, price, quantity, book::TimeInForce::Gtc, fills);
  }

  book::Status submitWith(int id, book::Side side, int price, int quantity, book::TimeInForce tif,
                          std::vector<book::Fill>& fills) override {
    if (!OrderRules::valid(id, price, quantity)) return book::Status::InvalidOrder;
    if (ledger_.seen(id)) return book::Status::DuplicateId;
    ledger_.record(id);
    Order order(id, side, price, quantity);
    fills.clear();
    enter(order, Dispositions::of(tif), fills);
    return book::Status::Ok;
  }

  book::Status cancel(int id) override {
    const RestingIndex::Handle* handle = index_.find(id);
    if (handle == nullptr) return book::Status::UnknownOrder;
    sides_.own(handle->side).remove(handle->price, handle->position);
    index_.forget(id);
    return book::Status::Ok;
  }

  book::Status amend(int id, int newPrice, int newQuantity, std::vector<book::Fill>& fills) override {
    fills.clear();
    if (!OrderRules::validTerms(newPrice, newQuantity)) return book::Status::InvalidOrder;
    const RestingIndex::Handle* handle = index_.find(id);
    if (handle == nullptr) return book::Status::UnknownOrder;
    fills.clear();
    if (handle->price == newPrice && newQuantity <= handle->position->remaining()) {
      handle->position->resize(newQuantity);  // same price, not larger: the place in the queue is kept
      return book::Status::Ok;
    }
    const book::Side side = handle->side;
    cancel(id);
    Order order(id, side, newPrice, newQuantity);
    enter(order, Dispositions::of(book::TimeInForce::Gtc), fills);
    return book::Status::Ok;
  }

  book::Status remaining(int id, int& out) const override {
    const RestingIndex::Handle* handle = index_.find(id);
    if (handle == nullptr) return book::Status::UnknownOrder;
    out = handle->position->remaining();
    return book::Status::Ok;
  }

  bool bestBid(int& price, int& quantity) const override { return sides_.own(book::Side::Buy).best(price, quantity); }
  bool bestAsk(int& price, int& quantity) const override { return sides_.own(book::Side::Sell).best(price, quantity); }
  int depthAt(book::Side side, int price) const override { return sides_.own(side).depthAt(price); }
  int restingCount() const override { return index_.count(); }

 private:
  // The one path an arriving order takes, whether it is new or comes back from an amend.
  void enter(Order& order, const Disposition& how, std::vector<book::Fill>& fills) {
    if (!how.mayTrade(matcher_, order)) return;
    matcher_.match(order, fills);
    if (order.done() || !how.restsRemainder()) return;
    const HalfBook::Position position = sides_.own(order.side()).add(order);
    index_.add(order.id(), RestingIndex::Handle{order.side(), order.price(), position});
  }

  Sides sides_;
  RestingIndex index_;
  IdLedger ledger_;
  Matcher matcher_;
};


std::unique_ptr<book::Book> book::makeBook() { return std::make_unique<BookImpl>(); }
std::unique_ptr<book::TimedBook> book::makeTimedBook() { return std::make_unique<BookImpl>(); }
std::unique_ptr<book::AmendBook> book::makeAmendBook() { return std::make_unique<BookImpl>(); }

