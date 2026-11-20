#include <algorithm>
#include <cstdint>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
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
  Status split(const std::string& s, int factor, int q) {
    if (s.empty() || factor < 2 || factor > 100 || q < 1 || q > broker::kMaxQuote) return Status::InvalidInput;
    if (!quotes.count(s)) return Status::NoQuote;
    for (auto& e : accounts) {
      for (MLot& l : e.second.pos[s]) l.shares *= factor;
    }
    quotes[s] = q;
    return Status::Ok;
  }
  Status dividend(const std::string& s, int c) {
    if (s.empty() || c < 1 || c > broker::kMaxQuote) return Status::InvalidInput;
    if (!quotes.count(s)) return Status::NoQuote;
    for (auto& e : accounts) {
      const long long paid = sharesOf(e.first, s) * c;
      e.second.cash += paid;
      e.second.dividends += paid;
    }
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


void runRandom(broker::CorporateBrokerage& bk, Model& m, std::uint64_t seed, int steps) {
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
    } else if (roll < 94) {
      const int n = 1 + static_cast<int>(next(rng) % 40);
      got = bk.sell(id, sym, n);
      want = m.sell(id, sym, n);
    } else if (roll < 97) {
      const int f = 2 + static_cast<int>(next(rng) % 3);
      const int q = 1 + static_cast<int>(next(rng) % 400);
      got = bk.split(sym, f, q);
      want = m.split(sym, f, q);
    } else {
      const int cents = 1 + static_cast<int>(next(rng) % 20);
      got = bk.dividend(sym, cents);
      want = m.dividend(sym, cents);
    }
    if (got != want) FAIL("a call answered differently from the model");
    for (int a = 1; a <= 3; ++a) {
      if (!agree(bk, m, a)) FAIL("an account differs from the model");
      long long d = 0, fp = 0;
      if (bk.dividendsReceived(a, d) != Status::Ok || d != m.accounts[a].dividends) FAIL("dividends differ from the model");
      if (bk.feesPaid(a, fp) != Status::Ok || fp != m.accounts[a].fees) FAIL("fees differ from the model");
    }
  }
}


using broker::FeeSchedule;

std::unique_ptr<broker::CorporateBrokerage> desk(long long flat = 0) {
  FeeSchedule f;
  f.flat = flat;
  return broker::makeCorporateBrokerage(f);
}
void fundAll(broker::Brokerage& b, int id, long long cash) {
  EXPECT_TRUE(b.openAccount(id) == Status::Ok);
  EXPECT_TRUE(b.deposit(id, cash) == Status::Ok);
}
long long dividendsOf(const broker::CorporateBrokerage& b, int id) {
  long long out = -1;
  return b.dividendsReceived(id, out) == Status::Ok ? out : -999999;
}

}  // namespace

TEST(Actions, ASplitMultipliesEveryLotKeepsTheCostAndTheFifoOrder) {
  auto b = desk();
  fundAll(*b, 1, 100000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 10), Ok);  // lot 1: 10 shares for 1000
  IS(b->setQuote("A", 200), Ok);
  IS(b->buy(1, "A", 10), Ok);  // lot 2: 10 shares for 2000
  IS(b->setQuote("A", 300), Ok);
  IS(b->split("A", 2, 150), Ok);
  EXPECT_EQ(sharesOf(*b, 1, "A"), 40);
  EXPECT_EQ(costOf(*b, 1, "A"), 3000);
  EXPECT_EQ(cashOf(*b, 1), 97000);
  EXPECT_EQ(realizedOf(*b, 1), 0);
  EXPECT_EQ(valueOf(*b, 1), 97000 + 40 * 150);
  IS(b->sell(1, "A", 10), Ok);  // half of lot 1: it holds 20 shares for 1000
  EXPECT_EQ(realizedOf(*b, 1), 1500 - 500);
  IS(b->sell(1, "A", 15), Ok);  // the other 10 of lot 1 (500) and 5 of lot 2's 20 shares (500)
  EXPECT_EQ(realizedOf(*b, 1), 1000 + (2250 - 1000));
  EXPECT_EQ(sharesOf(*b, 1, "A"), 15);
  EXPECT_EQ(costOf(*b, 1, "A"), 1500);
}

TEST(Actions, ASplitTouchesEveryHolderOfThatSymbolAndNothingElse) {
  auto b = desk();
  fundAll(*b, 1, 10000);
  fundAll(*b, 2, 10000);
  fundAll(*b, 3, 10000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->setQuote("B", 50), Ok);
  IS(b->buy(1, "A", 10), Ok);
  IS(b->buy(2, "A", 5), Ok);
  IS(b->buy(2, "B", 7), Ok);
  IS(b->split("A", 3, 40), Ok);
  EXPECT_EQ(sharesOf(*b, 1, "A"), 30);
  EXPECT_EQ(sharesOf(*b, 2, "A"), 15);
  EXPECT_EQ(sharesOf(*b, 2, "B"), 7);
  EXPECT_EQ(sharesOf(*b, 3, "A"), 0);
  EXPECT_EQ(costOf(*b, 1, "A"), 1000);
  EXPECT_EQ(valueOf(*b, 1), 9000 + 30 * 40);
  EXPECT_EQ(valueOf(*b, 2), 10000 - 500 - 350 + 15 * 40 + 7 * 50);
  EXPECT_EQ(positionsOf(*b, 2), 2);
  IS(b->buy(3, "A", 25), Ok);  // the new quote is what a later buy pays
  EXPECT_EQ(cashOf(*b, 3), 9000);
}

TEST(Actions, SplitChecksFollowTheDocumentedOrderAndARefusalChangesNothing) {
  auto b = desk();
  fundAll(*b, 1, 10000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 10), Ok);
  IS(b->split("", 2, 10), InvalidInput);
  IS(b->split("A", 1, 10), InvalidInput);
  IS(b->split("A", 101, 10), InvalidInput);
  IS(b->split("A", 2, 0), InvalidInput);
  IS(b->split("A", 2, broker::kMaxQuote + 1), InvalidInput);
  IS(b->split("NOPE", 1, 10), InvalidInput);  // the arguments are checked before the quote is looked up
  IS(b->split("NOPE", 2, 10), NoQuote);
  EXPECT_EQ(sharesOf(*b, 1, "A"), 10);
  EXPECT_EQ(valueOf(*b, 1), 9000 + 1000);  // the quote is still 100
  IS(b->split("A", 100, 1), Ok);
  EXPECT_EQ(sharesOf(*b, 1, "A"), 1000);
  IS(b->split("A", 2, 1), Ok);
  EXPECT_EQ(sharesOf(*b, 1, "A"), 2000);
}

TEST(Actions, ADividendPaysEveryHolderPerShareAndTouchesNeitherCostNorProfit) {
  auto b = desk();
  fundAll(*b, 1, 100000);
  fundAll(*b, 2, 100000);
  fundAll(*b, 3, 100000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 10), Ok);
  IS(b->buy(2, "A", 25), Ok);
  IS(b->dividend("A", 30), Ok);
  EXPECT_EQ(cashOf(*b, 1), 100000 - 1000 + 300);
  EXPECT_EQ(cashOf(*b, 2), 100000 - 2500 + 750);
  EXPECT_EQ(cashOf(*b, 3), 100000);
  EXPECT_EQ(dividendsOf(*b, 1), 300);
  EXPECT_EQ(dividendsOf(*b, 2), 750);
  EXPECT_EQ(dividendsOf(*b, 3), 0);
  EXPECT_EQ(costOf(*b, 1, "A"), 1000);
  EXPECT_EQ(realizedOf(*b, 1), 0);
  EXPECT_EQ(valueOf(*b, 1), 100000 - 1000 + 300 + 1000);
}

TEST(Actions, DividendChecksAndTheTotalQueryAreValidatedAndRefusalsChangeNothing) {
  auto b = desk();
  fundAll(*b, 1, 10000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 10), Ok);
  IS(b->dividend("", 30), InvalidInput);
  IS(b->dividend("A", 0), InvalidInput);
  IS(b->dividend("A", broker::kMaxQuote + 1), InvalidInput);
  IS(b->dividend("NOPE", 0), InvalidInput);
  IS(b->dividend("NOPE", 30), NoQuote);
  EXPECT_EQ(cashOf(*b, 1), 9000);
  EXPECT_EQ(dividendsOf(*b, 1), 0);
  long long out = 5;
  IS(b->dividendsReceived(0, out), InvalidInput);
  IS(b->dividendsReceived(9, out), UnknownAccount);
  EXPECT_EQ(out, 5);
}

TEST(Actions, ADividendCountsOnlyTheSharesHeldNowAndTotalsAccumulate) {
  auto b = desk();
  fundAll(*b, 1, 100000);
  fundAll(*b, 2, 100000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 10), Ok);
  IS(b->sell(1, "A", 4), Ok);
  IS(b->buy(2, "A", 5), Ok);
  IS(b->sell(2, "A", 5), Ok);  // sold out before the dividend
  IS(b->dividend("A", 10), Ok);
  EXPECT_EQ(dividendsOf(*b, 1), 60);
  EXPECT_EQ(dividendsOf(*b, 2), 0);
  IS(b->dividend("A", 5), Ok);
  EXPECT_EQ(dividendsOf(*b, 1), 90);
  EXPECT_EQ(cashOf(*b, 1), 100000 - 1000 + 400 + 90);
  IS(b->split("A", 2, 50), Ok);
  IS(b->dividend("A", 1), Ok);  // 12 shares now
  EXPECT_EQ(dividendsOf(*b, 1), 102);
}

TEST(Actions, ACostSplitAcrossMoreSharesIsGivenUpInProportionToTheNewCount) {
  auto b = desk(1);
  fundAll(*b, 1, 10000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 3), Ok);  // 3 shares for 301
  IS(b->split("A", 2, 50), Ok);
  EXPECT_EQ(sharesOf(*b, 1, "A"), 6);
  EXPECT_EQ(costOf(*b, 1, "A"), 301);
  IS(b->sell(1, "A", 2), Ok);  // value 100, fee 1; cost 301 x 2 / 6 = 100
  EXPECT_EQ(realizedOf(*b, 1), 99 - 100);
  EXPECT_EQ(costOf(*b, 1, "A"), 201);
  IS(b->sell(1, "A", 4), Ok);  // value 200, fee 1; the rest of the lot, 201
  EXPECT_EQ(realizedOf(*b, 1), -1 + (199 - 201));
  EXPECT_EQ(positionsOf(*b, 1), 0);
}

TEST(Model, RandomActivityWithSplitsAndDividendsMatchesAnIndependentImplementation) {
  const FeeSchedule schedules[] = {{0, 0, 0}, {3, 0, 0}, {0, 200, 2}};
  std::uint64_t seed = 21;
  for (const FeeSchedule& f : schedules) {
    for (int round = 0; round < 3; ++round) {
      auto b = broker::makeCorporateBrokerage(f);
      Model m(f);
      runRandom(*b, m, seed++ * 15485863, 1200);
    }
  }
}
