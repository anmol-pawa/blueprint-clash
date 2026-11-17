// MUTATION: A cancelled waiting order is still in the queue.
#include <algorithm>
#include <climits>
#include <map>
#include <memory>
#include <optional>
#include <set>
#include <string>
#include <utility>
#include <vector>
#include "api_storm2.h"

// What each restaurant sells and for how much. It knows nothing about orders, couriers or discounts.
class Menu {
 public:
  bool add(const std::string& restaurant, const std::vector<food::MenuItem>& items) {
    if (restaurant.empty() || items.empty() || menus_.count(restaurant) > 0) return false;
    std::map<std::string, food::Money> prices;
    for (const food::MenuItem& item : items) {
      if (item.name.empty() || item.price < 1 || !prices.emplace(item.name, item.price).second) return false;
    }
    menus_.emplace(restaurant, std::move(prices));
    return true;
  }

  bool knows(const std::string& restaurant) const { return menus_.count(restaurant) > 0; }

  // The price of one item, or nothing when the restaurant does not sell it. The restaurant must be known.
  std::optional<food::Money> priceOf(const std::string& restaurant, const std::string& item) const {
    const std::map<std::string, food::Money>& prices = menus_.at(restaurant);
    const auto found = prices.find(item);
    if (found == prices.end()) return std::nullopt;
    return found->second;
  }

 private:
  std::map<std::string, std::map<std::string, food::Money>> menus_;
};

// One order, as a record. It has no behaviour: which moves are legal is OrderLifecycle's decision.
struct Order {
  std::string customer;
  std::string restaurant;
  std::string courier;  // empty until assigned
  food::Money food;     // what the food costs after any discount; the base of the cancellation fee
  food::Money total;
  food::OrderState state;
};

// Who is asking for a move.
enum class Role { Restaurant, Courier, Customer };

// The state machine, written once as a table of legal moves.
class OrderLifecycle {
 public:
  static bool allows(food::OrderState from, food::OrderState to) {
    using food::OrderState;
    static const std::set<std::pair<OrderState, OrderState>> moves = {
        {OrderState::Placed, OrderState::Accepted},    {OrderState::Placed, OrderState::Rejected},
        {OrderState::Placed, OrderState::Cancelled},   {OrderState::Accepted, OrderState::Ready},
        {OrderState::Accepted, OrderState::Cancelled}, {OrderState::Ready, OrderState::PickedUp},
        {OrderState::Ready, OrderState::Cancelled},    {OrderState::PickedUp, OrderState::Delivered},
    };
    return moves.count({from, to}) > 0;
  }
};

// Keeps every order for good, issues ids, and is the ONE place where an order changes state: every change goes
// through move(), which tells the listeners (the Observer subject of the design).
class OrderBook {
 public:
  food::OrderId open(Order order) {
    const food::OrderId id = nextId_++;
    orders_.emplace(id, std::move(order));
    return id;
  }

  const Order* find(food::OrderId id) const {
    const auto found = orders_.find(id);
    return found == orders_.end() ? nullptr : &found->second;
  }

  void subscribe(food::Listener listener) { listeners_.push_back(std::move(listener)); }

  // The checks every lifecycle call shares, in the documented order. Changes nothing.
  food::Status check(food::OrderId id, Role role, const std::string& who, food::OrderState to) const {
    const Order* order = find(id);
    if (order == nullptr) return food::Status::UnknownOrder;
    if (!isParty(*order, role, who)) return food::Status::WrongParty;
    if (!OrderLifecycle::allows(order->state, to)) return food::Status::InvalidState;
    return food::Status::Ok;
  }

  void move(food::OrderId id, food::OrderState to) {
    Order& order = orders_.at(id);
    const food::OrderState from = order.state;
    order.state = to;
    for (const food::Listener& listener : listeners_) listener(id, from, to);
  }

  food::Status advance(food::OrderId id, Role role, const std::string& who, food::OrderState to) {
    const food::Status status = check(id, role, who, to);
    if (status == food::Status::Ok) move(id, to);
    return status;
  }

  void assign(food::OrderId id, const std::string& courier) { orders_.at(id).courier = courier; }

 private:
  static bool isParty(const Order& order, Role role, const std::string& who) {
    switch (role) {
      case Role::Restaurant: return order.restaurant == who;
      case Role::Customer: return order.customer == who;
      case Role::Courier: return !order.courier.empty() && order.courier == who;
    }
    return false;
  }

  food::OrderId nextId_ = 1;
  std::map<food::OrderId, Order> orders_;
  std::vector<food::Listener> listeners_;
};

// Couriers and the queue of ready orders that have none. Free couriers are found by lowest name; waiting orders go
// out oldest first. It records an assignment on the order, but never changes an order's state.
class CourierPool {
 public:
  explicit CourierPool(OrderBook& book) : book_(book) {}

  bool enroll(const std::string& courier) {
    if (courier.empty() || !holding_.emplace(courier, food::kNoOrder).second) return false;
    handOver(courier);
    return true;
  }

  void orderReady(food::OrderId id) {
    for (auto& [name, held] : holding_) {
      if (held != food::kNoOrder) continue;
      held = id;
      book_.assign(id, name);
      return;
    }
    waiting_.insert(id);
  }

  void orderDelivered(food::OrderId id) { handOver(book_.find(id)->courier); }

  void orderCancelled(food::OrderId id) {
    const std::string& courier = book_.find(id)->courier;
    if (courier.empty()) {
    } else {
      handOver(courier);
    }
  }

 private:
  // The courier is free; give them the oldest waiting order, if there is one.
  void handOver(const std::string& courier) {
    holding_[courier] = food::kNoOrder;
    if (waiting_.empty()) return;
    const food::OrderId next = *waiting_.begin();
    waiting_.erase(waiting_.begin());
    holding_[courier] = next;
    book_.assign(next, courier);
  }

  OrderBook& book_;
  std::map<std::string, food::OrderId> holding_;
  std::set<food::OrderId> waiting_;
};

constexpr int kPercentDenominator = 100;

// What a customer owes for cancelling, by the stage the order has reached. A Strategy: the rule is the part that
// changes with the business, and the lifecycle never looks inside it.
class CancellationFee {
 public:
  virtual ~CancellationFee() = default;
  virtual food::Money feeFor(food::OrderState state, food::Money cost) const = 0;
};

class StageFee : public CancellationFee {
 public:
  food::Money feeFor(food::OrderState state, food::Money cost) const override {
    switch (state) {
      case food::OrderState::Accepted: return cost * food::kCookingFeePercent / kPercentDenominator;
      case food::OrderState::Ready: return cost;
      default: return 0;
    }
  }
};

// A way of taking money off the food. The delivery fee is never part of it.
class Discount {
 public:
  virtual ~Discount() = default;
  virtual food::Money amount(food::Money food) const = 0;
};

class PercentOff : public Discount {
 public:
  explicit PercentOff(int percent) : percent_(percent) {}
  food::Money amount(food::Money food) const override { return food * percent_ / kPercentDenominator; }

 private:
  int percent_;
};

class AmountOff : public Discount {
 public:
  explicit AmountOff(food::Money cents) : cents_(cents) {}
  food::Money amount(food::Money food) const override { return std::min(cents_, food); }

 private:
  food::Money cents_;
};

// One code: what it takes off, and the smallest food total it applies to.
struct PromoRule {
  std::unique_ptr<Discount> discount;
  food::Money minimumFood;
};

// The codes the system was built with. Invalid or repeated entries are skipped, so a bad configuration never
// produces a half-working code.
class PromoBook {
 public:
  PromoBook() = default;

  explicit PromoBook(const std::vector<food::Promo>& promos) {
    for (const food::Promo& promo : promos) {
      std::unique_ptr<Discount> discount = build(promo);
      if (discount == nullptr || promo.code.empty() || promo.minimumFood < 0) continue;
      rules_.emplace(promo.code, PromoRule{std::move(discount), promo.minimumFood});
    }
  }

  const PromoRule* find(const std::string& code) const {
    const auto found = rules_.find(code);
    return found == rules_.end() ? nullptr : &found->second;
  }

 private:
  static std::unique_ptr<Discount> build(const food::Promo& promo) {
    if (promo.kind == food::PromoKind::PercentOff) {
      if (promo.value < 1 || promo.value > kPercentDenominator) return nullptr;
      return std::make_unique<PercentOff>(promo.value);
    }
    if (promo.value < 1) return nullptr;
    return std::make_unique<AmountOff>(promo.value);
  }

  std::map<std::string, PromoRule> rules_;
};

// Turns a request into an order: validates it in the documented order, prices it from the menu, applies a promo code
// if one is given, and records it. A failed request leaves nothing behind.
class OrderDesk {
 public:
  OrderDesk(const Menu& menu, const PromoBook& promos, OrderBook& book) : menu_(menu), promos_(promos), book_(book) {}

  food::PlaceResult place(const std::string& customer, const std::string& restaurant,
                          const std::vector<food::Line>& lines, const std::string* code) {
    if (!wellFormed(customer, lines) || (code != nullptr && code->empty())) {
      return food::PlaceResult{food::Status::InvalidRequest};
    }
    if (!menu_.knows(restaurant)) return food::PlaceResult{food::Status::UnknownRestaurant};
    food::Money cost = 0;
    for (const food::Line& line : lines) {
      const std::optional<food::Money> price = menu_.priceOf(restaurant, line.item);
      if (!price) return food::PlaceResult{food::Status::UnknownItem};
      cost += *price * line.quantity;
    }
    if (code != nullptr) {
      const PromoRule* rule = promos_.find(*code);
      if (rule == nullptr) return food::PlaceResult{food::Status::UnknownPromo};
      if (cost < rule->minimumFood) return food::PlaceResult{food::Status::PromoNotApplicable};
      cost -= rule->discount->amount(cost);
    }
    const food::Money total = cost + food::kDeliveryFee;
    const food::OrderId id = book_.open(Order{customer, restaurant, "", cost, total, food::OrderState::Placed});
    return food::PlaceResult{food::Status::Ok, id, total};
  }

 private:
  static bool wellFormed(const std::string& customer, const std::vector<food::Line>& lines) {
    if (customer.empty() || lines.empty()) return false;
    for (const food::Line& line : lines) {
      if (line.quantity < 1 || line.quantity > food::kMaxQuantity) return false;
    }
    return true;
  }

  const Menu& menu_;
  const PromoBook& promos_;
  OrderBook& book_;
};

// How many orders each kitchen is cooking right now, and whether it has a place free. It learns about the load by
// listening to the order book (Observer), so no lifecycle code has to remember to adjust it.
class KitchenLoad {
 public:
  static constexpr int kUnlimited = INT_MAX;

  KitchenLoad(const OrderBook& book, int slots) : book_(book), slots_(slots) {}

  bool hasRoom(const std::string& restaurant) const {
    const auto found = cooking_.find(restaurant);
    return found == cooking_.end() || found->second < slots_;
  }

  void observe(food::OrderId id, food::OrderState from, food::OrderState to) {
    const std::string& restaurant = book_.find(id)->restaurant;
    if (to == food::OrderState::Accepted) ++cooking_[restaurant];
    if (from == food::OrderState::Accepted) --cooking_[restaurant];
  }

 private:
  const OrderBook& book_;
  int slots_;
  std::map<std::string, int> cooking_;
};

// The public face. Each call is a few lines: ask the order book whether the move is legal, make it, and tell the
// collaborator that cares (couriers, kitchen load). Prices, fees, legal moves and who is free are decided elsewhere.
class FoodImpl : public food::PromoFood {
 public:
  FoodImpl(PromoBook promos, int kitchenSlots, std::unique_ptr<CancellationFee> fee)
      : promos_(std::move(promos)), fee_(std::move(fee)), couriers_(book_), kitchens_(book_, kitchenSlots), desk_(menu_, promos_, book_) {
    // The kitchen listens first, so it is up to date before any listener added by the caller runs.
    book_.subscribe([this](food::OrderId id, food::OrderState from, food::OrderState to) { kitchens_.observe(id, from, to); });
  }

  bool addRestaurant(const std::string& restaurant, const std::vector<food::MenuItem>& menu) override {
    return menu_.add(restaurant, menu);
  }

  bool registerCourier(const std::string& courier) override { return couriers_.enroll(courier); }

  void subscribe(food::Listener listener) override { book_.subscribe(std::move(listener)); }

  food::PlaceResult place(const std::string& customer, const std::string& restaurant,
                          const std::vector<food::Line>& lines) override {
    return desk_.place(customer, restaurant, lines, nullptr);
  }

  food::PlaceResult placeWithCode(const std::string& customer, const std::string& restaurant,
                                  const std::vector<food::Line>& lines, const std::string& code) override {
    return desk_.place(customer, restaurant, lines, &code);
  }

  food::Status accept(food::OrderId id, const std::string& restaurant) override {
    const food::Status status = book_.check(id, Role::Restaurant, restaurant, food::OrderState::Accepted);
    if (status != food::Status::Ok) return status;
    if (!kitchens_.hasRoom(restaurant)) return food::Status::KitchenFull;
    book_.move(id, food::OrderState::Accepted);
    return food::Status::Ok;
  }

  food::Status reject(food::OrderId id, const std::string& restaurant) override {
    return book_.advance(id, Role::Restaurant, restaurant, food::OrderState::Rejected);
  }

  food::Status ready(food::OrderId id, const std::string& restaurant) override {
    const food::Status status = book_.advance(id, Role::Restaurant, restaurant, food::OrderState::Ready);
    if (status == food::Status::Ok) couriers_.orderReady(id);
    return status;
  }

  food::Status pickUp(food::OrderId id, const std::string& courier) override {
    return book_.advance(id, Role::Courier, courier, food::OrderState::PickedUp);
  }

  food::Status deliver(food::OrderId id, const std::string& courier) override {
    const food::Status status = book_.advance(id, Role::Courier, courier, food::OrderState::Delivered);
    if (status == food::Status::Ok) couriers_.orderDelivered(id);
    return status;
  }

  food::CancelResult cancel(food::OrderId id, const std::string& customer) override {
    const food::Status status = book_.check(id, Role::Customer, customer, food::OrderState::Cancelled);
    if (status != food::Status::Ok) return food::CancelResult{status};
    const Order& order = *book_.find(id);
    const food::Money fee = fee_->feeFor(order.state, order.food);
    book_.move(id, food::OrderState::Cancelled);
    couriers_.orderCancelled(id);
    return food::CancelResult{food::Status::Ok, fee};
  }

  food::OrderInfo order(food::OrderId id) const override {
    const Order* found = book_.find(id);
    if (found == nullptr) return food::OrderInfo{food::Status::UnknownOrder};
    return food::OrderInfo{food::Status::Ok, found->state, found->customer, found->restaurant, found->courier, found->total};
  }

 private:
  Menu menu_;
  PromoBook promos_;
  std::unique_ptr<CancellationFee> fee_;
  OrderBook book_;
  CourierPool couriers_;
  KitchenLoad kitchens_;
  OrderDesk desk_;
};

std::unique_ptr<food::Food> food::makeFood() {
  return std::make_unique<FoodImpl>(PromoBook(), KitchenLoad::kUnlimited, std::make_unique<StageFee>());
}

std::unique_ptr<food::PromoFood> food::makePromoFood(const std::vector<food::Promo>& promos) {
  return std::make_unique<FoodImpl>(PromoBook(promos), KitchenLoad::kUnlimited, std::make_unique<StageFee>());
}

std::unique_ptr<food::PromoFood> food::makeBusyKitchens(const std::vector<food::Promo>& promos, int slots) {
  return std::make_unique<FoodImpl>(PromoBook(promos), slots < 1 ? 1 : slots, std::make_unique<StageFee>());
}
