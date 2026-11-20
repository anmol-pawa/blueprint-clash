#include <algorithm>
#include <cstdint>
#include <memory>
#include <set>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
using book::Fill;
using book::Side;
using book::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

constexpr Side B = Side::Buy;
constexpr Side S = Side::Sell;

std::vector<Fill> put(book::Book& b, int id, Side side, int price, int qty) {
  std::vector<Fill> fills;
  EXPECT_TRUE(b.submit(id, side, price, qty, fills) == Status::Ok);
  return fills;
}

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
}  // namespace

TEST(Orders, TheRangesAreCheckedAndRefusalsChangeNothing) {
  auto b = book::makeBook();
  std::vector<Fill> fills{Fill{9, 9, 9, 9}};
  IS(b->submit(0, B, 10, 1, fills), InvalidOrder);
  IS(b->submit(-5, B, 10, 1, fills), InvalidOrder);
  IS(b->submit(1, B, 0, 1, fills), InvalidOrder);
  IS(b->submit(1, B, book::kMaxPrice + 1, 1, fills), InvalidOrder);
  IS(b->submit(1, B, 10, 0, fills), InvalidOrder);
  IS(b->submit(1, B, 10, book::kMaxQuantity + 1, fills), InvalidOrder);
  EXPECT_EQ(fills.size(), static_cast<std::size_t>(1));  // a refused call leaves the out-parameter alone
  EXPECT_EQ(b->restingCount(), 0);
  IS(b->submit(1, B, 1, 1, fills), Ok);
  IS(b->submit(2, S, book::kMaxPrice, book::kMaxQuantity, fills), Ok);
  EXPECT_EQ(b->restingCount(), 2);
  EXPECT_EQ(remainingOf(*b, 2), book::kMaxQuantity);
}

TEST(Orders, AnIdIsNeverReusedAndInvalidIsCheckedBeforeDuplicate) {
  auto b = book::makeBook();
  std::vector<Fill> fills;
  IS(b->submit(7, S, 100, 5, fills), Ok);
  IS(b->submit(7, B, 90, 1, fills), DuplicateId);  // still resting
  IS(b->submit(7, B, 0, 1, fills), InvalidOrder);  // the order of the checks is the contract
  EXPECT_EQ(b->restingCount(), 1);
  EXPECT_EQ(remainingOf(*b, 7), 5);
  IS(b->submit(8, B, 100, 5, fills), Ok);  // 7 is filled in full
  EXPECT_EQ(b->restingCount(), 0);
  IS(b->submit(7, S, 100, 1, fills), DuplicateId);  // filled
  IS(b->submit(9, S, 100, 1, fills), Ok);
  IS(b->cancel(9), Ok);
  IS(b->submit(9, S, 100, 1, fills), DuplicateId);  // cancelled
  IS(b->submit(8, S, 100, 1, fills), DuplicateId);  // the taker that traded everything is used too
  EXPECT_EQ(b->restingCount(), 0);
}

TEST(Orders, OrdersThatDoNotCrossRestAndTheTopOfBookAddsUpAPriceLevel) {
  auto b = book::makeBook();
  EXPECT_TRUE(put(*b, 1, B, 99, 10).empty());
  EXPECT_TRUE(put(*b, 2, B, 99, 5).empty());
  EXPECT_TRUE(put(*b, 3, B, 98, 7).empty());
  EXPECT_TRUE(put(*b, 4, S, 101, 4).empty());
  EXPECT_TRUE(put(*b, 5, S, 101, 6).empty());
  EXPECT_TRUE(put(*b, 6, S, 103, 1).empty());
  EXPECT_EQ(bidPrice(*b), 99);
  EXPECT_EQ(bidQty(*b), 15);
  EXPECT_EQ(askPrice(*b), 101);
  EXPECT_EQ(askQty(*b), 10);
  EXPECT_EQ(b->depthAt(B, 98), 7);
  EXPECT_EQ(b->depthAt(S, 103), 1);
  EXPECT_EQ(b->depthAt(B, 101), 0);  // a price on the other side is not here
  EXPECT_EQ(b->depthAt(S, 99), 0);
  EXPECT_EQ(b->restingCount(), 6);
  int p = -1, q = -1;
  auto empty = book::makeBook();
  EXPECT_TRUE(!empty->bestBid(p, q));
  EXPECT_TRUE(!empty->bestAsk(p, q));
  EXPECT_EQ(p, -1);
  EXPECT_EQ(q, -1);
}

TEST(Matching, ATradeHappensAtTheRestingOrdersPriceNotTheIncomingLimit) {
  auto b = book::makeBook();
  put(*b, 1, S, 100, 10);
  const auto fills = put(*b, 2, B, 105, 4);
  EXPECT_TRUE(same(fills, {Fill{2, 1, 100, 4}}));
  EXPECT_EQ(remainingOf(*b, 1), 6);
  EXPECT_EQ(remainingOf(*b, 2), -1);  // fully traded: nothing rests
  const auto sells = put(*b, 3, S, 90, 3);  // no bids yet: a sell at 90 just rests
  EXPECT_TRUE(sells.empty());               
  put(*b, 4, B, 120, 5);                    // the buy meets the lowest ask first: 90, then 100
  EXPECT_EQ(remainingOf(*b, 3), -1);
  EXPECT_EQ(remainingOf(*b, 1), 4);
}

TEST(Matching, TheBestPriceTradesFirstOnBothSides) {
  auto b = book::makeBook();
  put(*b, 1, S, 102, 5);
  put(*b, 2, S, 100, 5);
  put(*b, 3, S, 101, 5);
  const auto buys = put(*b, 4, B, 102, 12);
  EXPECT_TRUE(same(buys, {Fill{4, 2, 100, 5}, Fill{4, 3, 101, 5}, Fill{4, 1, 102, 2}}));
  EXPECT_EQ(remainingOf(*b, 1), 3);

  auto c = book::makeBook();
  put(*c, 1, B, 98, 5);
  put(*c, 2, B, 100, 5);
  put(*c, 3, B, 99, 5);
  const auto sells = put(*c, 4, S, 98, 12);
  EXPECT_TRUE(same(sells, {Fill{4, 2, 100, 5}, Fill{4, 3, 99, 5}, Fill{4, 1, 98, 2}}));
  EXPECT_EQ(remainingOf(*c, 1), 3);
}

TEST(Matching, TheEarlierOrderAtAPriceTradesFirstAndAPartiallyFilledOneKeepsItsPlace) {
  auto b = book::makeBook();
  put(*b, 1, S, 100, 10);
  put(*b, 2, S, 100, 10);
  put(*b, 3, S, 100, 10);
  EXPECT_TRUE(same(put(*b, 4, B, 100, 4), {Fill{4, 1, 100, 4}}));
  // order 1 was hit but is still first in line
  EXPECT_TRUE(same(put(*b, 5, B, 100, 8), {Fill{5, 1, 100, 6}, Fill{5, 2, 100, 2}}));
  EXPECT_EQ(remainingOf(*b, 2), 8);
  EXPECT_EQ(askQty(*b), 18);
  // a later arrival at a better price jumps ahead, a later arrival at the same price does not
  put(*b, 6, S, 99, 1);
  put(*b, 7, S, 100, 1);
  EXPECT_TRUE(same(put(*b, 8, B, 100, 30), {Fill{8, 6, 99, 1}, Fill{8, 2, 100, 8}, Fill{8, 3, 100, 10}, Fill{8, 7, 100, 1}}));
  EXPECT_EQ(remainingOf(*b, 8), 10);
  EXPECT_EQ(bidPrice(*b), 100);
}

TEST(Matching, TheLimitIsRespectedAndTheRemainderRestsAtTheLimitNotAtTheLastPrice) {
  auto b = book::makeBook();
  put(*b, 1, S, 100, 4);
  put(*b, 2, S, 103, 4);
  EXPECT_TRUE(put(*b, 3, B, 99, 5).empty());  // 99 does not reach 100
  EXPECT_EQ(bidPrice(*b), 99);
  const auto fills = put(*b, 4, B, 102, 10);  // reaches 100 only
  EXPECT_TRUE(same(fills, {Fill{4, 1, 100, 4}}));
  EXPECT_EQ(remainingOf(*b, 4), 6);
  EXPECT_EQ(b->depthAt(B, 102), 6);  // it rests at ITS price, 102
  EXPECT_EQ(bidPrice(*b), 102);
  EXPECT_EQ(askPrice(*b), 103);
  // the best bid now crosses nothing, and a sell at 102 meets it first, before the older 99
  const auto sells = put(*b, 5, S, 99, 8);
  EXPECT_TRUE(same(sells, {Fill{5, 4, 102, 6}, Fill{5, 3, 99, 2}}));
  EXPECT_EQ(remainingOf(*b, 3), 3);
}

TEST(Matching, AnOrderNeverTradesWithItsOwnSideAndFillsAreReplacedOnOk) {
  auto b = book::makeBook();
  put(*b, 1, B, 100, 5);
  std::vector<Fill> fills{Fill{9, 9, 9, 9}, Fill{8, 8, 8, 8}};
  IS(b->submit(2, B, 120, 5, fills), Ok);
  EXPECT_TRUE(fills.empty());  // replaced by "no trades", the old content is gone
  EXPECT_EQ(b->restingCount(), 2);
  EXPECT_EQ(bidPrice(*b), 120);
}

TEST(Cancel, OnlyARestingOrderCanBeCancelledAndTheOthersKeepTheirPlaces) {
  auto b = book::makeBook();
  IS(b->cancel(1), UnknownOrder);  // never existed
  put(*b, 1, S, 100, 5);
  put(*b, 2, S, 100, 5);
  put(*b, 3, S, 100, 5);
  put(*b, 4, S, 101, 5);
  IS(b->cancel(2), Ok);
  IS(b->cancel(2), UnknownOrder);  // already gone
  EXPECT_EQ(askQty(*b), 10);
  EXPECT_EQ(b->restingCount(), 3);
  EXPECT_TRUE(same(put(*b, 5, B, 100, 7), {Fill{5, 1, 100, 5}, Fill{5, 3, 100, 2}}));
  IS(b->cancel(1), UnknownOrder);  // filled in full
  IS(b->cancel(5), UnknownOrder);  // the taker never rested
  IS(b->cancel(3), Ok);            // partly filled is still resting
  EXPECT_EQ(askPrice(*b), 101);    // the level 100 is gone with its last order
  EXPECT_EQ(b->depthAt(S, 100), 0);
  IS(b->cancel(4), Ok);
  int p = 0, q = 0;
  EXPECT_TRUE(!b->bestAsk(p, q));
  EXPECT_EQ(b->restingCount(), 0);
}

TEST(Queries, AnUnknownOrderLeavesTheOutParameterAlone) {
  auto b = book::makeBook();
  put(*b, 1, B, 50, 3);
  int q = 77;
  IS(b->remaining(2, q), UnknownOrder);
  EXPECT_EQ(q, 77);
  IS(b->remaining(1, q), Ok);
  EXPECT_EQ(q, 3);
  put(*b, 2, S, 50, 3);
  IS(b->remaining(1, q), UnknownOrder);  // filled
  EXPECT_EQ(q, 3);
}

namespace {
// An independent model: a list of orders and a linear search for the best counterparty each time.
struct ModelOrder {
  int id;
  Side side;
  int price;
  int rem;
  long seq;
};

class ModelBook {
 public:
  std::vector<Fill> submit(int id, Side side, int price, int qty) {
    std::vector<Fill> fills;
    ModelOrder taker{id, side, price, qty, seq_++};
    while (taker.rem > 0) {
      int best = -1;
      for (int i = 0; i < static_cast<int>(orders_.size()); ++i) {
        const ModelOrder& o = orders_[i];
        if (o.side == side) continue;
        const bool crosses = side == B ? o.price <= price : o.price >= price;
        if (!crosses) continue;
        if (best < 0 || better(o, orders_[best], side)) best = i;
      }
      if (best < 0) break;
      ModelOrder& maker = orders_[best];
      const int traded = std::min(taker.rem, maker.rem);
      fills.push_back(Fill{id, maker.id, maker.price, traded});
      taker.rem -= traded;
      maker.rem -= traded;
      if (maker.rem == 0) orders_.erase(orders_.begin() + best);
    }
    if (taker.rem > 0) orders_.push_back(taker);
    return fills;
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
  // For an incoming taker on `side`: is `a` a better counterparty than `b`?
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

TEST(Model, RandomOrdersAndCancelsMatchAnIndependentImplementation) {
  for (std::uint64_t seed = 1; seed <= 25; ++seed) {
    Rng rng(seed);
    auto b = book::makeBook();
    ModelBook model;
    std::set<int> used;
    int nextId = 1;
    for (int step = 0; step < 300; ++step) {
      if (rng.next(5) == 0 && nextId > 1) {
        const int id = 1 + rng.next(nextId - 1);
        const bool was = model.cancel(id);
        EXPECT_TRUE(b->cancel(id) == (was ? Status::Ok : Status::UnknownOrder));
      } else {
        const int id = nextId++;
        const Side side = rng.next(2) == 0 ? B : S;
        const int price = 95 + rng.next(11);
        const int qty = 1 + rng.next(12);
        const auto want = model.submit(id, side, price, qty);
        const auto got = put(*b, id, side, price, qty);
        EXPECT_TRUE(same(got, want));
        std::vector<Fill> again;
        EXPECT_TRUE(b->submit(id, side, price, qty, again) == Status::DuplicateId);
      }
      EXPECT_EQ(b->restingCount(), model.count());
      EXPECT_EQ(bidPrice(*b), model.best(B));
      EXPECT_EQ(askPrice(*b), model.best(S));
      if (model.best(B) != 0) EXPECT_EQ(bidQty(*b), model.depth(B, model.best(B)));
      if (model.best(S) != 0) EXPECT_EQ(askQty(*b), model.depth(S, model.best(S)));
    }
    for (int price = 95; price <= 105; ++price) {
      EXPECT_EQ(b->depthAt(B, price), model.depth(B, price));
      EXPECT_EQ(b->depthAt(S, price), model.depth(S, price));
    }
    for (int id = 1; id < nextId; ++id) EXPECT_EQ(remainingOf(*b, id), model.remaining(id));
  }
}
