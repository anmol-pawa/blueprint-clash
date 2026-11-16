#include <algorithm>
#include <map>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using split::Status;
using split::Transfer;
using Names = std::vector<std::string>;

struct Group {
  Group() : ledger(split::makeSimplifyingLedger()) {
    for (const char* name : {"ann", "bob", "cy", "dee", "eve"}) ledger->addMember(name);
  }

  // Makes every transfer with settleUp, then reports whether everyone is square.
  bool settleAll(const std::vector<Transfer>& plan) {
    for (const Transfer& t : plan) {
      if (ledger->settleUp(t.from, t.to, t.cents) != Status::Ok) return false;
    }
    for (const char* name : {"ann", "bob", "cy", "dee", "eve"}) {
      if (ledger->balance(name) != 0) return false;
    }
    return true;
  }

  std::unique_ptr<split::SimplifyingLedger> ledger;
};

bool is(const Transfer& t, const std::string& from, const std::string& to, long long cents) {
  return t.from == from && t.to == to && t.cents == cents;
}
}  // namespace

TEST(Simplify, ANewGroupHasNothingToSettle) {
  Group g;
  EXPECT_EQ(g.ledger->simplify().size(), 0u);
}

TEST(Simplify, OneDebtIsOnePayment) {
  Group g;
  g.ledger->addExpense("ann", 3000, Names{"ann", "bob"});
  auto plan = g.ledger->simplify();
  ASSERT_EQ(plan.size(), 1u);
  EXPECT_TRUE(is(plan[0], "bob", "ann", 1500));
}

TEST(Simplify, AChainOfDebtsCollapsesToOnePayment) {
  Group g;
  g.ledger->addExpense("bob", 1000, Names{"ann"});  // ann owes bob 1000
  g.ledger->addExpense("cy", 1000, Names{"bob"});   // bob owes cy 1000
  auto plan = g.ledger->simplify();
  ASSERT_EQ(plan.size(), 1u);
  EXPECT_TRUE(is(plan[0], "ann", "cy", 1000));
}

TEST(Simplify, ACircleOfDebtsCancelsOut) {
  Group g;
  g.ledger->addExpense("bob", 700, Names{"ann"});
  g.ledger->addExpense("cy", 700, Names{"bob"});
  g.ledger->addExpense("ann", 700, Names{"cy"});
  EXPECT_EQ(g.ledger->simplify().size(), 0u);
}

TEST(Simplify, TheLargestDebtorPaysTheLargestCreditorFirst) {
  Group g;
  g.ledger->addExpense("ann", 5000, Names{"bob"});  // bob -5000
  g.ledger->addExpense("cy", 2000, Names{"dee"});   // dee -2000
  g.ledger->addExpense("eve", 1000, Names{"bob"});  // bob -6000, eve +1000
  // balances: ann +5000, bob -6000, cy +2000, dee -2000, eve +1000
  // bob (6000) pays ann (5000); then dee (2000) beats bob (1000 left) and pays cy (2000); bob's last 1000 goes to eve
  auto plan = g.ledger->simplify();
  ASSERT_EQ(plan.size(), 3u);
  EXPECT_TRUE(is(plan[0], "bob", "ann", 5000));
  EXPECT_TRUE(is(plan[1], "dee", "cy", 2000));
  EXPECT_TRUE(is(plan[2], "bob", "eve", 1000));
}

TEST(Simplify, ATieGoesToTheNameThatSortsFirst) {
  Group g;
  g.ledger->addExpense("dee", 600, Names{"cy", "bob"});  // cy -300 bob -300, dee +600
  g.ledger->addExpense("eve", 600, Names{"ann"});        // ann -600, eve +600
  // debtors: ann 600, bob 300, cy 300; creditors: dee 600, eve 600 (a tie both sides)
  auto plan = g.ledger->simplify();
  ASSERT_EQ(plan.size(), 3u);
  EXPECT_TRUE(is(plan[0], "ann", "dee", 600));
  EXPECT_TRUE(is(plan[1], "bob", "eve", 300));
  EXPECT_TRUE(is(plan[2], "cy", "eve", 300));
}

TEST(Simplify, MakingEveryPaymentSquaresTheWholeGroup) {
  Group g;
  g.ledger->addExpense("ann", 12000, Names{"ann", "bob", "cy", "dee"});
  g.ledger->addExpense("bob", 4550, Names{"bob", "cy", "eve"});
  g.ledger->addExpense("cy", 999, Names{"ann", "dee", "eve"});
  g.ledger->addExpense("dee", 31, Names{"ann", "bob", "cy", "dee", "eve"});
  auto plan = g.ledger->simplify();
  EXPECT_TRUE(g.settleAll(plan));
}

TEST(Simplify, NeverMoreThanOneFewerPaymentsThanPeopleInvolved) {
  Group g;
  g.ledger->addExpense("ann", 1000, Names{"bob", "cy", "dee", "eve"});
  g.ledger->addExpense("bob", 700, Names{"ann", "cy"});
  g.ledger->addExpense("eve", 2500, Names{"ann", "bob", "cy", "dee"});
  std::map<std::string, long long> before;
  for (const char* name : {"ann", "bob", "cy", "dee", "eve"}) before[name] = g.ledger->balance(name);
  long long involved = 0;
  for (const auto& entry : before) involved += entry.second != 0 ? 1 : 0;
  auto plan = g.ledger->simplify();
  EXPECT_LE(static_cast<long long>(plan.size()), involved - 1);
  EXPECT_TRUE(g.settleAll(plan));
}

TEST(Simplify, EveryPaymentIsRealAndEveryoneIsOnOneSideOnly) {
  Group g;
  g.ledger->addExpense("ann", 1000, Names{"bob", "cy", "dee", "eve"});
  g.ledger->addExpense("bob", 700, Names{"ann", "cy"});
  g.ledger->addExpense("eve", 2500, Names{"ann", "bob", "cy", "dee"});
  auto plan = g.ledger->simplify();
  std::vector<std::string> payers;
  std::vector<std::string> payees;
  for (const Transfer& t : plan) {
    EXPECT_GE(t.cents, 1);
    EXPECT_TRUE(t.from != t.to);
    payers.push_back(t.from);
    payees.push_back(t.to);
  }
  for (const std::string& payer : payers) EXPECT_TRUE(std::find(payees.begin(), payees.end(), payer) == payees.end());
}

TEST(Simplify, AMemberWhoIsSquareNeverAppears) {
  Group g;
  g.ledger->addExpense("ann", 1000, Names{"bob"});
  g.ledger->addExpense("bob", 1000, Names{"ann"});  // cancels exactly
  g.ledger->addExpense("cy", 400, Names{"dee"});
  auto plan = g.ledger->simplify();
  ASSERT_EQ(plan.size(), 1u);
  EXPECT_TRUE(is(plan[0], "dee", "cy", 400));
}

TEST(Simplify, LookingDoesNotChangeTheLedger) {
  Group g;
  g.ledger->addExpense("ann", 3000, Names{"ann", "bob", "cy"});
  auto first = g.ledger->simplify();
  EXPECT_EQ(g.ledger->balance("bob"), -1000);
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 1000);
  auto second = g.ledger->simplify();
  ASSERT_EQ(first.size(), second.size());
  EXPECT_EQ(first.size(), 2u);
}

TEST(Simplify, ItWorksOnUnequalSplitsAndPaymentsToo) {
  Group g;
  g.ledger->addExpenseWith("ann", 10000, split::SplitSpec{split::SplitKind::Percent, {{"bob", 6000}, {"cy", 4000}}});
  g.ledger->settleUp("cy", "ann", 1000);
  auto plan = g.ledger->simplify();
  ASSERT_EQ(plan.size(), 2u);
  EXPECT_TRUE(is(plan[0], "bob", "ann", 6000));
  EXPECT_TRUE(is(plan[1], "cy", "ann", 3000));
  EXPECT_TRUE(g.settleAll(plan));
}
