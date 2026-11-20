#include <algorithm>
#include <cstdint>
#include <memory>
#include <vector>

#include "api_storm1.h"
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

std::vector<Fill> put(book::TimedBook& b, int id, Side side, int price, int qty, TimeInForce tif = TimeInForce::Gtc) {
  std::vector<Fill> fills;
  EXPECT_TRUE(b.submitWith(id, side, price, qty, tif, fills) == Status::Ok);
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

TEST(Tif, GoodTillCancelledIsTheOldBehaviourAndTheChecksAreUnchanged) {
  auto b = book::makeTimedBook();
  std::vector<Fill> fills{Fill{9, 9, 9, 9}};
  IS(b->submitWith(0, B, 10, 1, TimeInForce::Ioc, fills), InvalidOrder);
  IS(b->submitWith(1, B, 0, 1, TimeInForce::Fok, fills), InvalidOrder);
  EXPECT_EQ(fills.size(), static_cast<std::size_t>(1));
  EXPECT_TRUE(put(*b, 1, S, 100, 5).empty());
  IS(b->submitWith(1, B, 100, 1, TimeInForce::Ioc, fills), DuplicateId);
  EXPECT_TRUE(same(put(*b, 2, B, 100, 8, TimeInForce::Gtc), {Fill{2, 1, 100, 5}}));
  EXPECT_EQ(remainingOf(*b, 2), 3);
  // the plain interface is the same game
  std::vector<Fill> plain;
  IS(b->submit(3, S, 100, 10, plain), Ok);
  EXPECT_TRUE(same(plain, {Fill{3, 2, 100, 3}}));
  EXPECT_EQ(remainingOf(*b, 3), 7);
}

TEST(Tif, ImmediateOrCancelTradesWhatItCanAndNeverRests) {
  auto b = book::makeTimedBook();
  put(*b, 1, S, 100, 4);
  put(*b, 2, S, 101, 4);
  put(*b, 3, S, 105, 4);
  const auto fills = put(*b, 4, B, 102, 10, TimeInForce::Ioc);
  EXPECT_TRUE(same(fills, {Fill{4, 1, 100, 4}, Fill{4, 2, 101, 4}}));
  EXPECT_EQ(remainingOf(*b, 4), -1);  // the 2 left over is dropped, not rested at 102
  EXPECT_EQ(bidPrice(*b), 0);
  EXPECT_EQ(b->restingCount(), 1);
  // nothing to trade with: still accepted, nothing rests, the id is spent
  std::vector<Fill> none{Fill{9, 9, 9, 9}};
  IS(b->submitWith(5, S, 200, 5, TimeInForce::Ioc, none), Ok);
  EXPECT_TRUE(none.empty());
  EXPECT_EQ(b->restingCount(), 1);
  IS(b->submitWith(5, S, 200, 5, TimeInForce::Gtc, none), DuplicateId);
  IS(b->cancel(5), UnknownOrder);
}

TEST(Tif, FillOrKillTradesEverythingOrNothingAndTheBookIsUntouchedWhenItDoesNot) {
  auto b = book::makeTimedBook();
  put(*b, 1, S, 100, 4);
  put(*b, 2, S, 100, 3);
  put(*b, 3, S, 101, 5);
  put(*b, 4, S, 110, 50);   // beyond the limit
  put(*b, 5, B, 90, 100);   // own side: never counted
  // 12 wanted, only 12 reachable at 101 or better
  std::vector<Fill> none{Fill{9, 9, 9, 9}};
  IS(b->submitWith(6, B, 101, 13, TimeInForce::Fok, none), Ok);
  EXPECT_TRUE(none.empty());
  EXPECT_EQ(b->depthAt(S, 100), 7);  // nothing moved
  EXPECT_EQ(b->depthAt(S, 101), 5);
  EXPECT_EQ(remainingOf(*b, 1), 4);
  EXPECT_EQ(b->restingCount(), 5);   // the killed order did not rest
  EXPECT_EQ(remainingOf(*b, 6), -1);
  IS(b->submitWith(6, B, 101, 1, TimeInForce::Gtc, none), DuplicateId);
  // exactly enough: the whole quantity trades, in priority order
  const auto fills = put(*b, 7, B, 101, 12, TimeInForce::Fok);
  EXPECT_TRUE(same(fills, {Fill{7, 1, 100, 4}, Fill{7, 2, 100, 3}, Fill{7, 3, 101, 5}}));
  EXPECT_EQ(b->restingCount(), 2);
  // sells see only buys: the resting buy at 90 is 100 deep, and a sell limit of 91 cannot reach it
  std::vector<Fill> no91;
  IS(b->submitWith(8, S, 91, 1, TimeInForce::Fok, no91), Ok);
  EXPECT_TRUE(no91.empty());
  EXPECT_EQ(remainingOf(*b, 5), 100);
  EXPECT_TRUE(same(put(*b, 9, S, 90, 100, TimeInForce::Fok), {Fill{9, 5, 90, 100}}));
}

TEST(Tif, ARestingRemainderKeepsTimePriorityAmongGtcOrdersOnly) {
  auto b = book::makeTimedBook();
  put(*b, 1, B, 100, 5);
  put(*b, 2, S, 100, 2, TimeInForce::Ioc);  // trades 2 with order 1
  put(*b, 3, B, 100, 5);
  EXPECT_TRUE(same(put(*b, 4, S, 100, 6), {Fill{4, 1, 100, 3}, Fill{4, 3, 100, 3}}));
  EXPECT_EQ(remainingOf(*b, 3), 2);
}

TEST(Tif, RandomOrdersOfEveryKindMatchAnIndependentModel) {
  for (std::uint64_t seed = 1; seed <= 25; ++seed) {
    Rng rng(seed);
    auto b = book::makeTimedBook();
    ModelBook model;
    int nextId = 1;
    for (int step = 0; step < 300; ++step) {
      if (rng.next(6) == 0 && nextId > 1) {
        const int id = 1 + rng.next(nextId - 1);
        const bool was = model.cancel(id);
        EXPECT_TRUE(b->cancel(id) == (was ? Status::Ok : Status::UnknownOrder));
      } else {
        const int id = nextId++;
        const Side side = rng.next(2) == 0 ? B : S;
        const int price = 95 + rng.next(11);
        const int qty = 1 + rng.next(14);
        const int kind = rng.next(5);  // 0,1: Gtc, 2: Gtc, 3: Ioc, 4: Fok
        const int tif = kind < 3 ? 0 : kind - 2;
        const TimeInForce how = tif == 0 ? TimeInForce::Gtc : (tif == 1 ? TimeInForce::Ioc : TimeInForce::Fok);
        const auto want = model.submit(id, side, price, qty, tif);
        EXPECT_TRUE(same(put(*b, id, side, price, qty, how), want));
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
