#include <cstdint>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using split::SplitKind;
using split::SplitSpec;
using split::Status;
using Texts = std::vector<std::string>;

struct Rig {
  explicit Rig(const Texts& members = {"ann", "bob", "cat", "dan"}) : ledger(split::makeSimplifyingLedger()) {
    for (const auto& m : members) ledger->addMember(m);
  }
  static Texts show(const std::vector<split::Debt>& list) {
    Texts out;
    for (const auto& d : list) out.push_back(d.from + "->" + d.to + " " + std::to_string(d.cents));
    return out;
  }
  Texts simplified() const { return show(ledger->simplify()); }
  Texts debts() const { return show(ledger->debts()); }
  void exact(const std::string& payer, long long cents, const std::vector<split::Part>& parts) {
    SplitSpec spec;
    spec.kind = SplitKind::Exact;
    spec.parts = parts;
    ledger->addExpenseSplit(payer, cents, spec);
  }
  std::unique_ptr<split::SimplifyingLedger> ledger;
};
}  // namespace

TEST(Simplify, AnEmptyLedgerNeedsNoPayments) {
  Rig rig;
  EXPECT_TRUE(rig.ledger->simplify().empty());
}

TEST(Simplify, OneDebtStaysOneDebt) {
  Rig rig;
  rig.ledger->addExpense("ann", 1400, {"ann", "bob"});
  EXPECT_EQ(rig.simplified(), (Texts{"bob->ann 700"}));
}

TEST(Simplify, AChainOfDebtsBecomesOnePayment) {
  Rig rig;
  rig.ledger->addExpense("bob", 100, {"ann"});  // ann owes bob 100
  rig.ledger->addExpense("cat", 100, {"bob"});  // bob owes cat 100
  EXPECT_EQ(rig.debts(), (Texts{"ann->bob 100", "bob->cat 100"}));
  EXPECT_EQ(rig.simplified(), (Texts{"ann->cat 100"}));
}

TEST(Simplify, ACircleOfDebtsCancelsCompletely) {
  Rig rig;
  rig.ledger->addExpense("bob", 100, {"ann"});
  rig.ledger->addExpense("cat", 100, {"bob"});
  rig.ledger->addExpense("ann", 100, {"cat"});
  EXPECT_EQ(rig.debts().size(), 3u);
  EXPECT_TRUE(rig.ledger->simplify().empty());
}

TEST(Simplify, TheBiggestDebtorPaysTheBiggestCreditorFirst) {
  Rig rig;
  // Balances: ann +50, bob +30, cat -40, dan -40.
  rig.exact("ann", 50, {{"cat", 25}, {"dan", 25}});
  rig.exact("bob", 30, {{"cat", 15}, {"dan", 15}});
  EXPECT_EQ(rig.ledger->balance("cat"), -40);
  // cat and dan owe the same, so the smaller id (cat) goes first and pays ann (+50); then dan pays bob, then ann.
  EXPECT_EQ(rig.simplified(), (Texts{"cat->ann 40", "dan->bob 30", "dan->ann 10"}));
}

TEST(Simplify, ATieBetweenCreditorsGoesToTheSmallerId) {
  Rig rig;
  rig.exact("ann", 40, {{"cat", 40}});
  rig.exact("bob", 40, {{"cat", 40}});
  EXPECT_EQ(rig.simplified(), (Texts{"cat->ann 40", "cat->bob 40"}));
}

TEST(Simplify, ADebtorOwingMoreThanAnyCreditorPaysSeveral) {
  Rig rig;
  rig.exact("ann", 70, {{"dan", 70}});
  rig.exact("bob", 50, {{"dan", 50}});
  rig.exact("cat", 20, {{"dan", 20}});
  EXPECT_EQ(rig.simplified(), (Texts{"dan->ann 70", "dan->bob 50", "dan->cat 20"}));
}

TEST(Simplify, DoesNotChangeTheLedger) {
  Rig rig;
  rig.ledger->addExpense("ann", 1000, {"ann", "bob", "cat"});
  rig.ledger->addExpense("cat", 300, {"ann", "bob"});
  const Texts before = rig.debts();
  const long long balance = rig.ledger->balance("bob");
  const Texts first = rig.simplified();
  EXPECT_EQ(rig.simplified(), first);
  EXPECT_EQ(rig.debts(), before);
  EXPECT_EQ(rig.ledger->balance("bob"), balance);
}

TEST(Simplify, ReflectsSettlements) {
  Rig rig;
  rig.ledger->addExpense("ann", 3000, {"ann", "bob", "cat"});
  EXPECT_EQ(rig.simplified(), (Texts{"bob->ann 1000", "cat->ann 1000"}));
  rig.ledger->settle("bob", "ann", 1000);
  EXPECT_EQ(rig.simplified(), (Texts{"cat->ann 1000"}));
  rig.ledger->settle("cat", "ann", 1000);
  EXPECT_TRUE(rig.ledger->simplify().empty());
}

TEST(Simplify, WorksFromBalancesEvenWhenTheOriginalDebtsAreTangled) {
  Rig rig;
  rig.ledger->addExpense("ann", 1200, {"ann", "bob", "cat", "dan"});
  rig.ledger->addExpense("bob", 800, {"ann", "bob", "cat", "dan"});
  rig.ledger->addExpense("cat", 400, {"ann", "bob", "cat", "dan"});
  rig.ledger->addExpense("dan", 100, {"ann", "bob", "cat", "dan"});
  // paid: ann 1200, bob 800, cat 400, dan 100 (2500 in all); each person's own shares come to 625.
  EXPECT_EQ(rig.ledger->balance("ann"), 575);
  EXPECT_EQ(rig.ledger->balance("dan"), -525);
  EXPECT_EQ(rig.ledger->balance("bob"), 175);
  EXPECT_EQ(rig.simplified(), (Texts{"dan->ann 525", "cat->bob 175", "cat->ann 50"}));
}

TEST(Simplify, PayingTheListSettlesEveryoneWithFewPayments) {
  // A deterministic pseudo-random group: ten members, forty mixed expenses.
  std::uint32_t seed = 12345;
  auto next = [&seed](std::uint32_t bound) {
    seed = seed * 1664525u + 1013904223u;
    return (seed >> 8) % bound;
  };
  Texts names = {"m0", "m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9"};
  Rig rig(names);
  for (int i = 0; i < 40; ++i) {
    std::vector<std::string> sharers;
    for (const auto& n : names) {
      if (next(2) == 0) sharers.push_back(n);
    }
    if (sharers.empty()) sharers.push_back(names[next(10)]);
    rig.ledger->addExpense(names[next(10)], 100 + next(5000), sharers);
  }
  int nonZero = 0;
  for (const auto& n : names) {
    if (rig.ledger->balance(n) != 0) ++nonZero;
  }
  const auto payments = rig.ledger->simplify();
  EXPECT_TRUE(static_cast<int>(payments.size()) <= nonZero - 1);
  const Texts debtsBefore = rig.debts();
  for (const auto& p : payments) {
    EXPECT_TRUE(p.cents > 0);
    EXPECT_EQ(rig.ledger->settle(p.from, p.to, p.cents), Status::Ok);
  }
  for (const auto& n : names) EXPECT_EQ(rig.ledger->balance(n), 0);
  EXPECT_TRUE(rig.ledger->simplify().empty());
  EXPECT_TRUE(!debtsBefore.empty());
}
