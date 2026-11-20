#include <algorithm>
#include <cstdint>
#include <memory>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using book::Fill;
using book::Side;
using book::Status;
using book::TimeInForce;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

constexpr Side B = Side::Buy;
constexpr Side S = Side::Sell;

bool same(const std::vector<Fill>& got, const std::vector<Fill>& want) {
  if (got.size() != want.size()) return false;
  for (std::size_t i = 0; i < got.size(); ++i) {
    if (!(got[i] == want[i])) return false;
  }
  return true;
}
int remainingOf(const book::Book& b, int id) {
  int q = -1;
  return b.remaining(id, q) == Status::Ok ? q : -1;
}
int bidPrice(const book::Book& b) {
  int p = 0, q = 0;
  return b.bestBid(p, q) ? p : 0;
}
int askPrice(const book::Book& b) {
  int p = 0, q = 0;
  return b.bestAsk(p, q) ? p : 0;
}
int askQty(const book::Book& b) {
  int p = 0, q = 0;
  return b.bestAsk(p, q) ? q : 0;
}
int bidQty(const book::Book& b) {
  int p = 0, q = 0;
  return b.bestBid(p, q) ? q : 0;
}

std::vector<Fill> put(book::AmendBook& b, int id, Side side, int price, int qty, TimeInForce tif = TimeInForce::Gtc) {
  std::vector<Fill> fills;
  EXPECT_TRUE(b.submitWith(id, side, price, qty, tif, fills) == Status::Ok);
  return fills;
}
std::vector<Fill> change(book::AmendBook& b, int id, int price, int qty) {
  std::vector<Fill> fills{Fill{9, 9, 9, 9}};
  EXPECT_TRUE(b.amend(id, price, qty, fills) == Status::Ok);
  return fills;
}

struct ModelOrder {
  int id;
  Side side;
  int price;
  int rem;
  long seq;
};

class ModelBook {
 public:
  // tif: 0 = Gtc, 1 = Ioc, 2 = Fok
  std::vector<Fill> submit(int id, Side side, int price, int qty, int tif = 0) {
    ModelOrder taker{id, side, price, qty, seq_++};
    return enter(taker, tif);
  }
  std::vector<Fill> amend(int id, int price, int qty) {
    for (std::size_t i = 0; i < orders_.size(); ++i) {
      if (orders_[i].id != id) continue;
      if (orders_[i].price == price && qty <= orders_[i].rem) {
        orders_[i].rem = qty;
        return {};
      }
      ModelOrder again{id, orders_[i].side, price, qty, seq_++};
      orders_.erase(orders_.begin() + static_cast<long>(i));
      return enter(again, 0);
    }
    return {};
  }
  bool cancel(int id) {
    for (std::size_t i = 0; i < orders_.size(); ++i) {
      if (orders_[i].id == id) {
        orders_.erase(orders_.begin() + static_cast<long>(i));
        return true;
      }
    }
    return false;
  }
  int depth(Side side, int price) const {
    int sum = 0;
    for (const auto& o : orders_) sum += (o.side == side && o.price == price) ? o.rem : 0;
    return sum;
  }
  int best(Side side) const {
    int p = 0;
    for (const auto& o : orders_) {
      if (o.side != side) continue;
      if (p == 0 || (side == B ? o.price > p : o.price < p)) p = o.price;
    }
    return p;
  }
  int count() const { return static_cast<int>(orders_.size()); }
  int remaining(int id) const {
    for (const auto& o : orders_) {
      if (o.id == id) return o.rem;
    }
    return -1;
  }

 private:
  static bool crosses(const ModelOrder& taker, const ModelOrder& o) {
    if (o.side == taker.side) return false;
    return taker.side == B ? o.price <= taker.price : o.price >= taker.price;
  }
  int available(const ModelOrder& taker) const {
    int sum = 0;
    for (const auto& o : orders_) sum += crosses(taker, o) ? o.rem : 0;
    return sum;
  }
  std::vector<Fill> enter(ModelOrder taker, int tif) {
    std::vector<Fill> fills;
    if (tif == 2 && available(taker) < taker.rem) return fills;
    while (taker.rem > 0) {
      int best = -1;
      for (int i = 0; i < static_cast<int>(orders_.size()); ++i) {
        if (!crosses(taker, orders_[i])) continue;
        if (best < 0 || better(orders_[i], orders_[best], taker.side)) best = i;
      }
      if (best < 0) break;
      ModelOrder& maker = orders_[best];
      const int traded = std::min(taker.rem, maker.rem);
      fills.push_back(Fill{taker.id, maker.id, maker.price, traded});
      taker.rem -= traded;
      maker.rem -= traded;
      if (maker.rem == 0) orders_.erase(orders_.begin() + best);
    }
    if (taker.rem > 0 && tif == 0) orders_.push_back(taker);
    return fills;
  }
  static bool better(const ModelOrder& a, const ModelOrder& b, Side side) {
    if (a.price != b.price) return side == B ? a.price < b.price : a.price > b.price;
    return a.seq < b.seq;
  }
  std::vector<ModelOrder> orders_;
  long seq_ = 0;
};

class Rng {
 public:
  explicit Rng(std::uint64_t seed) : s_(seed) {}
  int next(int bound) {
    s_ = s_ * 6364136223846793005ULL + 1442695040888963407ULL;
    return static_cast<int>((s_ >> 33) % static_cast<std::uint64_t>(bound));
  }

 private:
  std::uint64_t s_;
};
}  // namespace

TEST(Amend, RefusalsFollowTheDocumentedOrderAndChangeNothing) {
  auto b = book::makeAmendBook();
  put(*b, 1, S, 100, 5);
  std::vector<Fill> fills{Fill{9, 9, 9, 9}};
  IS(b->amend(1, 0, 5, fills), InvalidOrder);
  IS(b->amend(1, book::kMaxPrice + 1, 5, fills), InvalidOrder);
  IS(b->amend(1, 100, 0, fills), InvalidOrder);
  IS(b->amend(1, 100, book::kMaxQuantity + 1, fills), InvalidOrder);
  IS(b->amend(2, 0, 5, fills), InvalidOrder);  // invalid is checked before unknown
  IS(b->amend(2, 100, 5, fills), UnknownOrder);
  EXPECT_EQ(fills.size(), static_cast<std::size_t>(1));
  EXPECT_EQ(remainingOf(*b, 1), 5);
  put(*b, 3, B, 100, 5);  // fills order 1 in full
  IS(b->amend(1, 100, 5, fills), UnknownOrder);
  put(*b, 4, B, 50, 5);
  IS(b->cancel(4), Ok);
  IS(b->amend(4, 50, 3, fills), UnknownOrder);
  IS(b->amend(0, 50, 3, fills), UnknownOrder);
}

TEST(Amend, LessQuantityAtTheSamePriceKeepsThePlaceInTheQueue) {
  auto b = book::makeAmendBook();
  put(*b, 1, S, 100, 10);
  put(*b, 2, S, 100, 10);
  EXPECT_TRUE(change(*b, 1, 100, 4).empty());  // the out-parameter is replaced by "no trades"
  EXPECT_EQ(remainingOf(*b, 1), 4);
  EXPECT_EQ(b->depthAt(S, 100), 14);
  EXPECT_TRUE(change(*b, 1, 100, 4).empty());  // the same quantity keeps it too
  EXPECT_TRUE(same(put(*b, 3, B, 100, 6), {Fill{3, 1, 100, 4}, Fill{3, 2, 100, 2}}));
}

TEST(Amend, MoreQuantityOrANewPriceSendsTheOrderToTheBackOfItsQueue) {
  auto b = book::makeAmendBook();
  put(*b, 1, S, 100, 5);
  put(*b, 2, S, 100, 5);
  put(*b, 3, S, 101, 5);
  EXPECT_TRUE(change(*b, 1, 100, 6).empty());  // 5 -> 6 loses the place
  EXPECT_TRUE(same(put(*b, 4, B, 100, 7), {Fill{4, 2, 100, 5}, Fill{4, 1, 100, 2}}));
  EXPECT_EQ(remainingOf(*b, 1), 4);
  // a price change and a change back: back of the queue at the new level
  EXPECT_TRUE(change(*b, 3, 100, 5).empty());
  EXPECT_TRUE(change(*b, 1, 102, 4).empty());
  EXPECT_TRUE(change(*b, 1, 100, 4).empty());  // now behind order 3 at 100
  EXPECT_TRUE(same(put(*b, 5, B, 100, 6), {Fill{5, 3, 100, 5}, Fill{5, 1, 100, 1}}));
  EXPECT_EQ(askPrice(*b), 100);
  EXPECT_EQ(remainingOf(*b, 1), 3);
}

TEST(Amend, TheNewQuantityIsTheNewTotalRemainingAfterAPartialFill) {
  auto b = book::makeAmendBook();
  put(*b, 1, S, 100, 10);
  put(*b, 2, S, 100, 10);
  put(*b, 3, B, 100, 4);  // order 1 has 6 left
  EXPECT_TRUE(change(*b, 1, 100, 6).empty());  // not larger than what remains: keeps its place
  EXPECT_TRUE(same(put(*b, 4, B, 100, 1), {Fill{4, 1, 100, 1}}));
  EXPECT_TRUE(change(*b, 1, 100, 6).empty());  // 5 -> 6 is MORE: loses its place
  EXPECT_TRUE(same(put(*b, 5, B, 100, 11), {Fill{5, 2, 100, 10}, Fill{5, 1, 100, 1}}));
  EXPECT_EQ(remainingOf(*b, 1), 5);
}

TEST(Amend, ACrossingAmendTradesAtOnceAtTheMakersPriceAndTheRestRests) {
  auto b = book::makeAmendBook();
  put(*b, 1, S, 100, 4);
  put(*b, 2, S, 101, 4);
  put(*b, 3, B, 95, 10);
  const auto fills = change(*b, 3, 101, 10);
  EXPECT_TRUE(same(fills, {Fill{3, 1, 100, 4}, Fill{3, 2, 101, 4}}));
  EXPECT_EQ(remainingOf(*b, 3), 2);
  EXPECT_EQ(b->depthAt(B, 95), 0);
  EXPECT_EQ(b->depthAt(B, 101), 2);  // rests at its new price, as a good-till-cancelled order
  EXPECT_EQ(b->restingCount(), 1);
  IS(b->cancel(3), Ok);
  std::vector<Fill> dup;
  IS(b->submit(3, B, 10, 1, dup), DuplicateId);  // the id never comes free
}

TEST(Amend, ACrossingAmendThatTradesEverythingLeavesNothingResting) {
  auto b = book::makeAmendBook();
  put(*b, 1, S, 100, 10);
  put(*b, 2, B, 90, 5);
  EXPECT_TRUE(same(change(*b, 2, 100, 5), {Fill{2, 1, 100, 5}}));
  EXPECT_EQ(remainingOf(*b, 2), -1);
  EXPECT_EQ(remainingOf(*b, 1), 5);
  std::vector<Fill> fills;
  IS(b->amend(2, 100, 5, fills), UnknownOrder);
}

TEST(Amend, RandomOperationsIncludingAmendsMatchAnIndependentModel) {
  for (std::uint64_t seed = 1; seed <= 25; ++seed) {
    Rng rng(seed);
    auto b = book::makeAmendBook();
    ModelBook model;
    int nextId = 1;
    for (int step = 0; step < 300; ++step) {
      const int roll = rng.next(8);
      if (roll == 0 && nextId > 1) {
        const int id = 1 + rng.next(nextId - 1);
        const bool was = model.cancel(id);
        EXPECT_TRUE(b->cancel(id) == (was ? Status::Ok : Status::UnknownOrder));
      } else if (roll <= 3 && nextId > 1) {
        const int id = 1 + rng.next(nextId - 1);
        const int price = 95 + rng.next(11);
        const int qty = 1 + rng.next(14);
        const bool resting = model.remaining(id) > 0;
        std::vector<Fill> fills;
        const Status st = b->amend(id, price, qty, fills);
        EXPECT_TRUE(st == (resting ? Status::Ok : Status::UnknownOrder));
        if (resting) EXPECT_TRUE(same(fills, model.amend(id, price, qty)));
      } else {
        const int id = nextId++;
        const Side side = rng.next(2) == 0 ? B : S;
        const int price = 95 + rng.next(11);
        const int qty = 1 + rng.next(14);
        const int tif = rng.next(4) == 0 ? 1 + rng.next(2) : 0;
        const TimeInForce how = tif == 0 ? TimeInForce::Gtc : (tif == 1 ? TimeInForce::Ioc : TimeInForce::Fok);
        EXPECT_TRUE(same(put(*b, id, side, price, qty, how), model.submit(id, side, price, qty, tif)));
      }
      EXPECT_EQ(b->restingCount(), model.count());
      EXPECT_EQ(bidPrice(*b), model.best(B));
      EXPECT_EQ(askPrice(*b), model.best(S));
      if (model.best(B) != 0) EXPECT_EQ(bidQty(*b), model.depth(B, model.best(B)));
      if (model.best(S) != 0) EXPECT_EQ(askQty(*b), model.depth(S, model.best(S)));
    }
    for (int id = 1; id < nextId; ++id) EXPECT_EQ(remainingOf(*b, id), model.remaining(id));
  }
}
