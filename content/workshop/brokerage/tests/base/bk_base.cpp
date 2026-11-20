#include <algorithm>
#include <cstdint>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "api.h"
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
  
  std::map<int, MAccount> accounts;
  std::map<std::string, int> quotes;

  long long feeOf(long long value) const {
    return 0 * value;
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


void runRandom(broker::Brokerage& bk, Model& m, std::uint64_t seed, int steps) {
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
    }
  }
}


// An account with `cash` already deposited and the symbol quoted.
void fund(broker::Brokerage& b, int id, long long cash) {
  EXPECT_TRUE(b.openAccount(id) == Status::Ok);
  EXPECT_TRUE(b.deposit(id, cash) == Status::Ok);
}

}  // namespace

TEST(Accounts, OpeningAccountsAndTheRangesAndTheCheckOrder) {
  auto b = broker::makeBrokerage();
  IS(b->openAccount(0), InvalidInput);
  IS(b->openAccount(-3), InvalidInput);
  IS(b->openAccount(1), Ok);
  IS(b->openAccount(1), DuplicateAccount);
  IS(b->deposit(0, 100), InvalidInput);
  IS(b->deposit(1, 0), InvalidInput);
  IS(b->deposit(1, -5), InvalidInput);
  IS(b->deposit(1, broker::kMaxCash + 1), InvalidInput);
  IS(b->deposit(9, 0), InvalidInput);  // the amount is checked before the account is looked up
  IS(b->deposit(9, 5), UnknownAccount);
  EXPECT_EQ(cashOf(*b, 1), 0);
  IS(b->deposit(1, broker::kMaxCash), Ok);
  EXPECT_EQ(cashOf(*b, 1), broker::kMaxCash);
  IS(b->openAccount(1), DuplicateAccount);  // a second open must not wipe the account
  EXPECT_EQ(cashOf(*b, 1), broker::kMaxCash);
  Statement s;
  s.cash = 77;
  IS(b->statement(0, s), InvalidInput);
  IS(b->statement(9, s), UnknownAccount);
  EXPECT_EQ(s.cash, 77);  // the out-parameter is touched only on Ok
  EXPECT_EQ(realizedOf(*b, 1), 0);
  EXPECT_EQ(positionsOf(*b, 1), 0);
}

TEST(Accounts, WithdrawingExactlyTheCashIsFineAndMoreIsRefused) {
  auto b = broker::makeBrokerage();
  fund(*b, 1, 500);
  IS(b->withdraw(1, 501), InsufficientFunds);
  EXPECT_EQ(cashOf(*b, 1), 500);
  IS(b->withdraw(1, 0), InvalidInput);
  IS(b->withdraw(0, 1), InvalidInput);
  IS(b->withdraw(7, 0), InvalidInput);
  IS(b->withdraw(7, 1), UnknownAccount);
  IS(b->withdraw(1, 500), Ok);
  EXPECT_EQ(cashOf(*b, 1), 0);
  IS(b->withdraw(1, 1), InsufficientFunds);
}

TEST(Accounts, QuotesAreValidatedAndReplacedNeverRemoved) {
  auto b = broker::makeBrokerage();
  fund(*b, 1, 100000);
  IS(b->setQuote("", 100), InvalidInput);
  IS(b->setQuote("A", 0), InvalidInput);
  IS(b->setQuote("A", broker::kMaxQuote + 1), InvalidInput);
  IS(b->buy(1, "A", 1), NoQuote);  // the refused quotes did not create one
  IS(b->setQuote("A", broker::kMaxQuote), Ok);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 3), Ok);
  EXPECT_EQ(cashOf(*b, 1), 99700);
}

TEST(Trading, ABuyMovesCashIntoAHoldingAtTheCurrentQuote) {
  auto b = broker::makeBrokerage();
  fund(*b, 1, 100000);
  IS(b->setQuote("ACME", 2500), Ok);
  IS(b->buy(1, "ACME", 10), Ok);
  EXPECT_EQ(cashOf(*b, 1), 75000);
  EXPECT_EQ(sharesOf(*b, 1, "ACME"), 10);
  EXPECT_EQ(costOf(*b, 1, "ACME"), 25000);
  EXPECT_EQ(valueOf(*b, 1), 100000);
  EXPECT_EQ(positionsOf(*b, 1), 1);
  EXPECT_EQ(realizedOf(*b, 1), 0);
  EXPECT_EQ(sharesOf(*b, 1, "OTHER"), 0);
  EXPECT_EQ(costOf(*b, 1, "OTHER"), 0);
}

TEST(Trading, BuyChecksFollowTheDocumentedOrderAndARefusalChangesNothing) {
  auto b = broker::makeBrokerage();
  fund(*b, 1, 1000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(0, "A", 1), InvalidInput);
  IS(b->buy(1, "", 1), InvalidInput);
  IS(b->buy(1, "A", 0), InvalidInput);
  IS(b->buy(1, "A", broker::kMaxShares + 1), InvalidInput);
  IS(b->buy(9, "", 1), InvalidInput);        // a bad symbol is reported before an unknown account
  IS(b->buy(9, "A", 1), UnknownAccount);
  IS(b->buy(9, "NOPE", 1), UnknownAccount);  // an unknown account before a missing quote
  IS(b->buy(1, "NOPE", 5000), NoQuote);      // a missing quote before the money is looked at
  IS(b->buy(1, "A", 11), InsufficientFunds);
  EXPECT_EQ(cashOf(*b, 1), 1000);
  EXPECT_EQ(sharesOf(*b, 1, "A"), 0);
  EXPECT_EQ(positionsOf(*b, 1), 0);
  IS(b->buy(1, "A", 10), Ok);  // exactly what the cash covers
  EXPECT_EQ(cashOf(*b, 1), 0);
}

TEST(Trading, ASaleIsPaidAtTheCurrentQuoteAndRealizesTheDifference) {
  auto b = broker::makeBrokerage();
  fund(*b, 1, 100000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 10), Ok);
  IS(b->setQuote("A", 130), Ok);
  IS(b->sell(1, "A", 4), Ok);
  EXPECT_EQ(cashOf(*b, 1), 99520);
  EXPECT_EQ(realizedOf(*b, 1), 120);
  EXPECT_EQ(sharesOf(*b, 1, "A"), 6);
  EXPECT_EQ(costOf(*b, 1, "A"), 600);
  EXPECT_EQ(valueOf(*b, 1), 99520 + 6 * 130);
}

TEST(Trading, SellChecksFollowTheDocumentedOrderAndARefusalChangesNothing) {
  auto b = broker::makeBrokerage();
  fund(*b, 1, 100000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->setQuote("B", 50), Ok);
  IS(b->buy(1, "A", 10), Ok);
  IS(b->sell(0, "A", 1), InvalidInput);
  IS(b->sell(1, "", 1), InvalidInput);
  IS(b->sell(1, "A", 0), InvalidInput);
  IS(b->sell(1, "A", broker::kMaxShares + 1), InvalidInput);
  IS(b->sell(9, "A", 1), UnknownAccount);
  IS(b->sell(1, "A", 11), InsufficientShares);
  IS(b->sell(1, "B", 1), InsufficientShares);      // never held
  IS(b->sell(1, "NOPE", 1), InsufficientShares);   // never even quoted
  EXPECT_EQ(cashOf(*b, 1), 99000);
  EXPECT_EQ(sharesOf(*b, 1, "A"), 10);
  EXPECT_EQ(realizedOf(*b, 1), 0);
  IS(b->sell(1, "A", 10), Ok);  // exactly what is held
  EXPECT_EQ(sharesOf(*b, 1, "A"), 0);
}

TEST(Lots, SalesUseUpTheOldestLotFirst) {
  auto b = broker::makeBrokerage();
  fund(*b, 1, 100000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 10), Ok);
  IS(b->setQuote("A", 200), Ok);
  IS(b->buy(1, "A", 10), Ok);
  IS(b->setQuote("A", 300), Ok);
  EXPECT_EQ(costOf(*b, 1, "A"), 3000);
  IS(b->sell(1, "A", 15), Ok);  // all of the 100 lot and half of the 200 lot
  EXPECT_EQ(cashOf(*b, 1), 97000 + 4500);
  EXPECT_EQ(realizedOf(*b, 1), 4500 - (10 * 100 + 5 * 200));
  EXPECT_EQ(sharesOf(*b, 1, "A"), 5);
  EXPECT_EQ(costOf(*b, 1, "A"), 1000);
  IS(b->sell(1, "A", 5), Ok);
  EXPECT_EQ(realizedOf(*b, 1), 3000);
  EXPECT_EQ(costOf(*b, 1, "A"), 0);
  EXPECT_EQ(positionsOf(*b, 1), 0);
}

TEST(Lots, ASoldOutSymbolIsNotCountedAndCanBeBoughtAgain) {
  auto b = broker::makeBrokerage();
  fund(*b, 1, 100000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->setQuote("B", 10), Ok);
  IS(b->buy(1, "A", 5), Ok);
  IS(b->buy(1, "B", 5), Ok);
  EXPECT_EQ(positionsOf(*b, 1), 2);
  IS(b->sell(1, "A", 5), Ok);
  EXPECT_EQ(positionsOf(*b, 1), 1);
  IS(b->setQuote("A", 120), Ok);
  IS(b->buy(1, "A", 2), Ok);
  EXPECT_EQ(positionsOf(*b, 1), 2);
  EXPECT_EQ(sharesOf(*b, 1, "A"), 2);
  EXPECT_EQ(costOf(*b, 1, "A"), 240);  // the old lot is gone, only the new purchase counts
}

TEST(Lots, LossesAreNegativeAndTheTotalAddsUp) {
  auto b = broker::makeBrokerage();
  fund(*b, 1, 100000);
  IS(b->setQuote("B", 500), Ok);
  IS(b->buy(1, "B", 4), Ok);
  IS(b->setQuote("B", 300), Ok);
  IS(b->sell(1, "B", 4), Ok);
  EXPECT_EQ(realizedOf(*b, 1), -800);
  IS(b->buy(1, "B", 2), Ok);
  IS(b->setQuote("B", 400), Ok);
  IS(b->sell(1, "B", 1), Ok);
  EXPECT_EQ(realizedOf(*b, 1), -700);
  EXPECT_EQ(costOf(*b, 1, "B"), 300);
}

TEST(Valuation, ValueIsCashPlusSharesAtTodaysQuoteAndAccountsAreSeparate) {
  auto b = broker::makeBrokerage();
  fund(*b, 1, 10000);
  fund(*b, 2, 10000);
  IS(b->setQuote("A", 100), Ok);
  IS(b->buy(1, "A", 10), Ok);
  IS(b->buy(2, "A", 20), Ok);
  IS(b->setQuote("A", 150), Ok);
  EXPECT_EQ(valueOf(*b, 1), 9000 + 1500);
  EXPECT_EQ(valueOf(*b, 2), 8000 + 3000);
  EXPECT_EQ(costOf(*b, 1, "A"), 1000);  // a new quote does not change what the shares cost
  EXPECT_EQ(costOf(*b, 2, "A"), 2000);
  IS(b->sell(1, "A", 10), Ok);
  EXPECT_EQ(sharesOf(*b, 2, "A"), 20);
  EXPECT_EQ(cashOf(*b, 2), 8000);
  EXPECT_EQ(realizedOf(*b, 2), 0);
  EXPECT_EQ(valueOf(*b, 1), 10500);
}

TEST(Valuation, LargeOrdersDoNotOverflow) {
  auto b = broker::makeBrokerage();
  fund(*b, 1, broker::kMaxCash);
  IS(b->deposit(1, broker::kMaxCash), Ok);
  IS(b->setQuote("BIG", broker::kMaxQuote), Ok);
  IS(b->buy(1, "BIG", broker::kMaxShares), Ok);  // 10^6 x 10^6 cents does not fit in an int
  EXPECT_EQ(cashOf(*b, 1), 2 * broker::kMaxCash - 1000000000000LL);
  EXPECT_EQ(costOf(*b, 1, "BIG"), 1000000000000LL);
  EXPECT_EQ(valueOf(*b, 1), 2 * broker::kMaxCash);
  IS(b->setQuote("BIG", broker::kMaxQuote - 1), Ok);
  IS(b->sell(1, "BIG", broker::kMaxShares), Ok);
  EXPECT_EQ(realizedOf(*b, 1), -1000000);
  EXPECT_EQ(cashOf(*b, 1), 2 * broker::kMaxCash - 1000000);
}

TEST(Valuation, HoldingAndStatementQueriesAreCheckedAndLeaveTheOutParameterAlone) {
  auto b = broker::makeBrokerage();
  fund(*b, 1, 100);
  Holding h;
  h.shares = 5;
  h.costBasis = 6;
  IS(b->holding(0, "A", h), InvalidInput);
  IS(b->holding(1, "", h), InvalidInput);
  IS(b->holding(9, "A", h), UnknownAccount);
  EXPECT_EQ(h.shares, 5);
  EXPECT_EQ(h.costBasis, 6);
  IS(b->holding(1, "ZZZ", h), Ok);
  EXPECT_EQ(h.shares, 0);
  EXPECT_EQ(h.costBasis, 0);
}

TEST(Model, RandomActivityMatchesAnIndependentImplementation) {
  for (std::uint64_t seed = 1; seed <= 6; ++seed) {
    auto b = broker::makeBrokerage();
    Model m;
    runRandom(*b, m, seed * 7919, 1500);
  }
}
