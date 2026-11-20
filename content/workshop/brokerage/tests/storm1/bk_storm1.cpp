#include <algorithm>
#include <cstdint>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
using broker::Holding;
using broker::Statement;
using broker::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

long long cashOf(const broker::Brokerage& b, int id) {
  Statement s;
  return b.statement(id, s) == Status::Ok ? s.cash : -999999;
}
long long realizedOf(const broker::Brokerage& b, int id) {
  Statement s;
  return b.statement(id, s) == Status::Ok ? s.realizedPnl : -999999;
}
long long valueOf(const broker::Brokerage& b, int id) {
  Statement s;
  return b.statement(id, s) == Status::Ok ? s.portfolioValue : -999999;
}
int positionsOf(const broker::Brokerage& b, int id) {
  Statement s;
  return b.statement(id, s) == Status::Ok ? s.positionCount : -1;
}
long long sharesOf(const broker::Brokerage& b, int id, const std::string& sym) {
  Holding h;
  return b.holding(id, sym, h) == Status::Ok ? h.shares : -1;
}
long long costOf(const broker::Brokerage& b, int id, const std::string& sym) {
  Holding h;
  return b.holding(id, sym, h) == Status::Ok ? h.costBasis : -1;
}

struct MLot {
  long long shares;
  long long cost;
};
struct MAccount {
  long long cash = 0, realized = 0, fees = 0, dividends = 0;
  std::map<std::string, std::vector<MLot>> pos;
};

class Model {
 public:
  explicit Model(const broker::FeeSchedule& f) : schedule(f) {}
  broker::FeeSchedule schedule;
  std::map<int, MAccount> accounts;
  std::map<std::string, int> quotes;

  long long feeOf(long long value) const {
    const long long pct = (value * schedule.basisPoints + 9999) / 10000;
    const long long fee = schedule.flat + pct;
    return fee < schedule.minimum ? schedule.minimum : fee;
  }
  Status open(int id) {
    if (id < 1) return Status::InvalidInput;
    return accounts.emplace(id, MAccount()).second ? Status::Ok : Status::DuplicateAccount;
  }
  Status deposit(int id, long long c) {
    if (id < 1 || c < 1 || c > broker::kMaxCash) return Status::InvalidInput;
    if (!accounts.count(id)) return Status::UnknownAccount;
    accounts[id].cash += c;
    return Status::Ok;
  }
  Status withdraw(int id, long long c) {
    if (id < 1 || c < 1 || c > broker::kMaxCash) return Status::InvalidInput;
    if (!accounts.count(id)) return Status::UnknownAccount;
    if (accounts[id].cash < c) return Status::InsufficientFunds;
    accounts[id].cash -= c;
    return Status::Ok;
  }
  Status quote(const std::string& s, int c) {
    if (s.empty() || c < 1 || c > broker::kMaxQuote) return Status::InvalidInput;
    quotes[s] = c;
    return Status::Ok;
  }
  Status buy(int id, const std::string& s, int n) {
    if (id < 1 || s.empty() || n < 1 || n > broker::kMaxShares) return Status::InvalidInput;
    if (!accounts.count(id)) return Status::UnknownAccount;
    if (!quotes.count(s)) return Status::NoQuote;
    MAccount& a = accounts[id];
    const long long value = static_cast<long long>(n) * quotes[s];
    const long long fee = feeOf(value);
    if (a.cash < value + fee) return Status::InsufficientFunds;
    a.cash -= value + fee;
    a.fees += fee;
    a.pos[s].push_back({n, value + fee});
    return Status::Ok;
  }
  Status sell(int id, const std::string& s, int n) {
    if (id < 1 || s.empty() || n < 1 || n > broker::kMaxShares) return Status::InvalidInput;
    if (!accounts.count(id)) return Status::UnknownAccount;
    MAccount& a = accounts[id];
    long long held = 0;
    for (const MLot& l : a.pos[s]) held += l.shares;
    if (held < n) return Status::InsufficientShares;
    const long long value = static_cast<long long>(n) * quotes[s];
    const long long fee = feeOf(value);
    if (fee > value) return Status::InsufficientFunds;
    long long need = n, cost = 0;
    std::vector<MLot>& lots = a.pos[s];
    while (need > 0) {
      MLot& l = lots.front();
      const long long used = std::min(need, l.shares);
      const long long given = used == l.shares ? l.cost : l.cost * used / l.shares;
      l.shares -= used;
      l.cost -= given;
      cost += given;
      need -= used;
      if (l.shares == 0) lots.erase(lots.begin());
    }
    a.cash += value - fee;
    a.fees += fee;
    a.realized += value - fee - cost;
    return Status::Ok;
  }

  long long sharesOf(int id, const std::string& s) {
    long long t = 0;
    for (const MLot& l : accounts[id].pos[s]) t += l.shares;
    return t;
  }
  long long costOf(int id, const std::string& s) {
    long long t = 0;
    for (const MLot& l : accounts[id].pos[s]) t += l.cost;
    return t;
  }
  long long valueOf(int id) {
    long long t = accounts[id].cash;
    for (const auto& e : accounts[id].pos) t += sharesOf(id, e.first) * (quotes.count(e.first) ? quotes[e.first] : 0);
    return t;
  }
  int positionsOf(int id) {
    int n = 0;
    for (const auto& e : accounts[id].pos) n += sharesOf(id, e.first) > 0 ? 1 : 0;
    return n;
  }
};

const char* const kSymbols[] = {"AAA", "BBB", "CCC"};

std::uint64_t next(std::uint64_t& s) {
  s = s * 6364136223846793005ULL + 1442695040888963407ULL;
  return s >> 33;
}

bool agree(const broker::Brokerage& b, Model& m, int id) {
  Statement st;
  if (b.statement(id, st) != Status::Ok) return false;
  if (st.cash != m.accounts[id].cash || st.realizedPnl != m.accounts[id].realized) return false;
  if (st.portfolioValue != m.valueOf(id) || st.positionCount != m.positionsOf(id)) return false;
  for (const char* sym : kSymbols) {
    Holding h;
    if (b.holding(id, sym, h) != Status::Ok) return false;
    if (h.shares != m.sharesOf(id, sym) || h.costBasis != m.costOf(id, sym)) return false;
  }
  return true;
}


void runRandom(broker::FeeBrokerage& bk, Model& m, std::uint64_t seed, int steps) {
  std::uint64_t rng = seed;
  for (int id = 1; id <= 3; ++id) {
    EXPECT_TRUE(bk.openAccount(id) == Status::Ok);
    EXPECT_TRUE(m.open(id) == Status::Ok);
  }
  for (int i = 0; i < steps; ++i) {
    const int id = 1 + static_cast<int>(next(rng) % 3);
    const std::string sym = kSymbols[next(rng) % 3];
    const int roll = static_cast<int>(next(rng) % 100);
    Status got = Status::Ok, want = Status::Ok;
    if (roll < 10) {
      const int q = 1 + static_cast<int>(next(rng) % 400);
      got = bk.setQuote(sym, q);
      want = m.quote(sym, q);
    } else if (roll < 25) {
      const long long c = 1 + static_cast<long long>(next(rng) % 50000);
      got = bk.deposit(id, c);
      want = m.deposit(id, c);
    } else if (roll < 30) {
      const long long c = 1 + static_cast<long long>(next(rng) % 20000);
      got = bk.withdraw(id, c);
      want = m.withdraw(id, c);
    } else if (roll < 62) {
      const int n = 1 + static_cast<int>(next(rng) % 40);
      got = bk.buy(id, sym, n);
      want = m.buy(id, sym, n);
    } else if (roll < 100) {
      const int n = 1 + static_cast<int>(next(rng) % 40);
      got = bk.sell(id, sym, n);
      want = m.sell(id, sym, n);
    }
    if (got != want) FAIL("a call answered differently from the model");
    for (int a = 1; a <= 3; ++a) {
      if (!agree(bk, m, a)) FAIL("an account differs from the model");
      long long fp = 0;
      if (bk.feesPaid(a, fp) != Status::Ok || fp != m.accounts[a].fees) FAIL("fees differ from the model");
    }
  }
}


using broker::FeeSchedule;

std::unique_ptr<broker::FeeBrokerage> feeDesk(long long flat, int bps, long long minimum) {
  FeeSchedule f;
  f.flat = flat;
  f.basisPoints = bps;
  f.minimum = minimum;
  return broker::makeFeeBrokerage(f);
}
void fundFee(broker::Brokerage& b, int id, long long cash) {
  EXPECT_TRUE(b.openAccount(id) == Status::Ok);
  EXPECT_TRUE(b.deposit(id, cash) == Status::Ok);
}
long long feesOf(const broker::FeeBrokerage& b, int id) {
  long long out = -1;
  return b.feesPaid(id, out) == Status::Ok ? out : -999999;
}

}  // namespace

TEST(Fees, ANoCommissionScheduleBehavesLikeTheBaseBrokerage) {
  auto b = feeDesk(0, 0, 0);
  fundFee(*b, 1, 10000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 10), Ok);
  IS(b->setQuote("A", 120), Ok);
  IS(b->sell(1, "A", 10), Ok);
  EXPECT_EQ(cashOf(*b, 1), 10200);
  EXPECT_EQ(realizedOf(*b, 1), 200);
  EXPECT_EQ(feesOf(*b, 1), 0);
}

TEST(Fees, AFlatFeeIsPaidOnABuyAndBecomesPartOfTheCost) {
  auto b = feeDesk(100, 0, 0);
  fundFee(*b, 1, 5100);
  fundFee(*b, 2, 5099);
  IS(b->setQuote("X", 1000), Ok);
  IS(b->buy(2, "X", 5), InsufficientFunds);  // 5000 + 100 does not fit in 5099
  EXPECT_EQ(cashOf(*b, 2), 5099);
  EXPECT_EQ(feesOf(*b, 2), 0);
  EXPECT_EQ(sharesOf(*b, 2, "X"), 0);
  IS(b->buy(1, "X", 5), Ok);
  EXPECT_EQ(cashOf(*b, 1), 0);
  EXPECT_EQ(costOf(*b, 1, "X"), 5100);
  EXPECT_EQ(feesOf(*b, 1), 100);
  EXPECT_EQ(valueOf(*b, 1), 5000);  // the fee is gone, the shares are worth their quote
}

TEST(Fees, PercentFeesRoundUpToAWholeCentAndTheMinimumApplies) {
  auto b = feeDesk(0, 25, 50);
  fundFee(*b, 1, 1000000);
  IS(b->setQuote("Q", 1), Ok);
  IS(b->buy(1, "Q", 10000), Ok);  // 0.25% of 10000 is 25, below the minimum of 50
  EXPECT_EQ(feesOf(*b, 1), 50);
  IS(b->buy(1, "Q", 100000), Ok);  // exactly 250
  EXPECT_EQ(feesOf(*b, 1), 300);
  IS(b->buy(1, "Q", 100001), Ok);  // 250.0025 rounds UP to 251
  EXPECT_EQ(feesOf(*b, 1), 551);
  EXPECT_EQ(costOf(*b, 1, "Q"), 210001 + 551);
  auto c = feeDesk(30, 100, 0);
  fundFee(*c, 1, 100000);
  IS(c->setQuote("Z", 1999), Ok);
  IS(c->buy(1, "Z", 1), Ok);  // 1% of 1999 is 19.99, rounds up to 20, plus the flat 30
  EXPECT_EQ(feesOf(*c, 1), 50);
  EXPECT_EQ(cashOf(*c, 1), 100000 - 1999 - 50);
}

TEST(Fees, ASaleKeepsTheFeeOutOfTheProceedsAndTheProfit) {
  auto b = feeDesk(0, 100, 0);
  fundFee(*b, 1, 100000);
  IS(b->setQuote("A", 1000), Ok);
  IS(b->buy(1, "A", 10), Ok);  // 10000 + 100
  EXPECT_EQ(cashOf(*b, 1), 89900);
  EXPECT_EQ(costOf(*b, 1, "A"), 10100);
  IS(b->setQuote("A", 1200), Ok);
  IS(b->sell(1, "A", 10), Ok);  // 12000 - 120
  EXPECT_EQ(cashOf(*b, 1), 89900 + 11880);
  EXPECT_EQ(realizedOf(*b, 1), 11880 - 10100);
  EXPECT_EQ(feesOf(*b, 1), 220);
}

TEST(Fees, APartlyUsedLotGivesUpCostInProportionAndNoCentIsLost) {
  auto b = feeDesk(1, 0, 0);
  fundFee(*b, 1, 10000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 3), Ok);  // 3 shares for 300 + 1
  EXPECT_EQ(costOf(*b, 1, "A"), 301);
  IS(b->sell(1, "A", 1), Ok);  // 301 x 1 / 3 = 100 (rounded down)
  EXPECT_EQ(costOf(*b, 1, "A"), 201);
  EXPECT_EQ(realizedOf(*b, 1), 99 - 100);
  IS(b->sell(1, "A", 1), Ok);  // 201 x 1 / 2 = 100
  EXPECT_EQ(costOf(*b, 1, "A"), 101);
  IS(b->sell(1, "A", 1), Ok);  // the last share takes everything that is left
  EXPECT_EQ(costOf(*b, 1, "A"), 0);
  EXPECT_EQ(realizedOf(*b, 1), 3 * 99 - 301);
  EXPECT_EQ(cashOf(*b, 1), 10000 - 301 + 3 * 99);
  EXPECT_EQ(feesOf(*b, 1), 4);
}

TEST(Fees, ASaleReachingIntoASecondLotTakesTheWholeOldLotFirst) {
  auto b = feeDesk(1, 0, 0);
  fundFee(*b, 1, 10000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 3), Ok);  // lot of 3 for 301
  IS(b->buy(1, "A", 2), Ok);  // lot of 2 for 201
  IS(b->sell(1, "A", 4), Ok);  // all of the first lot (301) and one of the second (201 x 1 / 2 = 100)
  EXPECT_EQ(realizedOf(*b, 1), 399 - 401);
  EXPECT_EQ(sharesOf(*b, 1, "A"), 1);
  EXPECT_EQ(costOf(*b, 1, "A"), 101);
}

TEST(Fees, ASaleWhoseFeeIsMoreThanItsValueIsRefusedAndOneEqualToItIsNot) {
  auto b = feeDesk(500, 0, 0);
  fundFee(*b, 1, 10000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 10), Ok);  // value 1000, fee 500, cost 1500
  EXPECT_EQ(cashOf(*b, 1), 8500);
  IS(b->sell(1, "A", 100), InsufficientShares);  // the shares are checked first
  IS(b->sell(1, "A", 4), InsufficientFunds);     // value 400 cannot pay a fee of 500
  EXPECT_EQ(sharesOf(*b, 1, "A"), 10);
  EXPECT_EQ(cashOf(*b, 1), 8500);
  EXPECT_EQ(feesOf(*b, 1), 500);
  EXPECT_EQ(realizedOf(*b, 1), 0);
  IS(b->sell(1, "A", 5), Ok);  // value 500, fee 500: nothing is paid out
  EXPECT_EQ(cashOf(*b, 1), 8500);
  EXPECT_EQ(realizedOf(*b, 1), -750);
  EXPECT_EQ(costOf(*b, 1, "A"), 750);
  EXPECT_EQ(feesOf(*b, 1), 1000);
}

TEST(Fees, FeesPaidIsCheckedAndLeavesTheOutParameterAlone) {
  auto b = feeDesk(1, 0, 0);
  fundFee(*b, 1, 100);
  long long out = 42;
  IS(b->feesPaid(0, out), InvalidInput);
  IS(b->feesPaid(9, out), UnknownAccount);
  EXPECT_EQ(out, 42);
  IS(b->feesPaid(1, out), Ok);
  EXPECT_EQ(out, 0);
}

TEST(Model, RandomActivityWithCommissionsMatchesAnIndependentImplementation) {
  const FeeSchedule schedules[] = {{0, 0, 0}, {7, 0, 0}, {0, 150, 3}, {2, 40, 9}, {0, 9999, 1}};
  std::uint64_t seed = 11;
  for (const FeeSchedule& f : schedules) {
    auto b = broker::makeFeeBrokerage(f);
    Model m(f);
    runRandom(*b, m, seed++ * 104729, 1500);
  }
}
