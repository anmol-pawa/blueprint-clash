#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
using split::Status;
using Names = std::vector<std::string>;

// A group of four friends: ann, bob, cy and dee.
struct Group {
  Group() : ledger(split::makeLedger()) {
    for (const char* name : {"ann", "bob", "cy", "dee"}) ledger->addMember(name);
  }

  long long sumOfBalances() const {
    long long total = 0;
    for (const char* name : {"ann", "bob", "cy", "dee"}) total += ledger->balance(name);
    return total;
  }

  std::unique_ptr<split::Ledger> ledger;
};
}  // namespace

TEST(Members, ANameIsNeededAndCannotJoinTwice) {
  auto ledger = split::makeLedger();
  EXPECT_FALSE(ledger->addMember(""));
  EXPECT_TRUE(ledger->addMember("ann"));
  EXPECT_FALSE(ledger->addMember("ann"));
  EXPECT_TRUE(ledger->addMember("bob"));
}

TEST(Validation, TheAmountMustBeBetweenOneCentAndTheLimit) {
  Group g;
  EXPECT_TRUE(g.ledger->addExpense("ann", 0, Names{"ann", "bob"}) == Status::InvalidAmount);
  EXPECT_TRUE(g.ledger->addExpense("ann", -500, Names{"ann", "bob"}) == Status::InvalidAmount);
  EXPECT_TRUE(g.ledger->addExpense("ann", split::kMaxCents + 1, Names{"ann", "bob"}) == Status::InvalidAmount);
  EXPECT_TRUE(g.ledger->addExpense("ann", 1, Names{"ann", "bob"}) == Status::Ok);
  EXPECT_TRUE(g.ledger->addExpense("ann", split::kMaxCents, Names{"ann", "bob"}) == Status::Ok);
}

TEST(Validation, AnExpenseNeedsSomeoneToShareIt) {
  Group g;
  EXPECT_TRUE(g.ledger->addExpense("ann", 1000, Names{}) == Status::NoParticipants);
}

TEST(Validation, EveryNameMustBeAMember) {
  Group g;
  EXPECT_TRUE(g.ledger->addExpense("zed", 1000, Names{"ann", "bob"}) == Status::UnknownMember);
  EXPECT_TRUE(g.ledger->addExpense("ann", 1000, Names{"ann", "zed"}) == Status::UnknownMember);
  EXPECT_TRUE(g.ledger->addExpense("ann", 1000, Names{"zed", "ann"}) == Status::UnknownMember);
}

TEST(Validation, ANameCannotBeListedTwice) {
  Group g;
  EXPECT_TRUE(g.ledger->addExpense("ann", 1000, Names{"bob", "cy", "bob"}) == Status::DuplicateParticipant);
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 0);
}

TEST(Validation, TheChecksRunInTheDocumentedOrder) {
  Group g;
  // amount before participants before names before duplicates
  EXPECT_TRUE(g.ledger->addExpense("zed", 0, Names{}) == Status::InvalidAmount);
  EXPECT_TRUE(g.ledger->addExpense("zed", 1000, Names{}) == Status::NoParticipants);
  EXPECT_TRUE(g.ledger->addExpense("zed", 1000, Names{"bob", "bob"}) == Status::UnknownMember);
  EXPECT_TRUE(g.ledger->addExpense("ann", 1000, Names{"bob", "bob", "zed"}) == Status::UnknownMember);
}

TEST(Validation, ARefusedExpenseChangesNothing) {
  Group g;
  g.ledger->addExpense("ann", 900, Names{"ann", "bob", "zed"});
  g.ledger->addExpense("ann", 900, Names{"bob", "cy", "bob"});
  g.ledger->addExpense("zed", 900, Names{"bob", "cy"});
  g.ledger->addExpense("ann", 0, Names{"bob", "cy"});
  for (const char* name : {"ann", "bob", "cy", "dee"}) EXPECT_EQ(g.ledger->balance(name), 0);
}

TEST(Equal, ThreeFriendsShareAnEvenBill) {
  Group g;
  EXPECT_TRUE(g.ledger->addExpense("ann", 3000, Names{"ann", "bob", "cy"}) == Status::Ok);
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 1000);
  EXPECT_EQ(g.ledger->owed("cy", "ann"), 1000);
  EXPECT_EQ(g.ledger->owed("ann", "bob"), 0);
  EXPECT_EQ(g.ledger->balance("ann"), 2000);
  EXPECT_EQ(g.ledger->balance("bob"), -1000);
  EXPECT_EQ(g.ledger->balance("cy"), -1000);
  EXPECT_EQ(g.ledger->balance("dee"), 0);
}

TEST(Equal, ThePayerDoesNotHaveToShareTheBill) {
  Group g;
  EXPECT_TRUE(g.ledger->addExpense("dee", 1000, Names{"ann", "bob"}) == Status::Ok);
  EXPECT_EQ(g.ledger->owed("ann", "dee"), 500);
  EXPECT_EQ(g.ledger->owed("bob", "dee"), 500);
  EXPECT_EQ(g.ledger->balance("dee"), 1000);
}

TEST(Equal, APayerWhoSharesTheBillOwesOnlyTheirOwnPortion) {
  Group g;
  g.ledger->addExpense("ann", 9000, Names{"ann", "bob", "cy"});
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 3000);
  EXPECT_EQ(g.ledger->owed("cy", "ann"), 3000);
  EXPECT_EQ(g.ledger->owed("ann", "ann"), 0);
  EXPECT_EQ(g.ledger->balance("ann"), 6000);
}

TEST(Equal, TheLeftoverCentsGoOneEachToTheFirstNames) {
  Group g;
  g.ledger->addExpense("dee", 100, Names{"ann", "bob", "cy"});
  EXPECT_EQ(g.ledger->owed("ann", "dee"), 34);
  EXPECT_EQ(g.ledger->owed("bob", "dee"), 33);
  EXPECT_EQ(g.ledger->owed("cy", "dee"), 33);
  Group h;
  h.ledger->addExpense("dee", 101, Names{"ann", "bob", "cy"});
  EXPECT_EQ(h.ledger->owed("ann", "dee"), 34);
  EXPECT_EQ(h.ledger->owed("bob", "dee"), 34);
  EXPECT_EQ(h.ledger->owed("cy", "dee"), 33);
}

TEST(Equal, TheOrderOfTheListDecidesWhoPaysTheExtraCent) {
  Group g;
  g.ledger->addExpense("dee", 100, Names{"cy", "bob", "ann"});
  EXPECT_EQ(g.ledger->owed("cy", "dee"), 34);
  EXPECT_EQ(g.ledger->owed("bob", "dee"), 33);
  EXPECT_EQ(g.ledger->owed("ann", "dee"), 33);
}

TEST(Equal, NoCentIsEverLostOrInvented) {
  for (long long cents = 1; cents <= 60; ++cents) {
    Group g;
    g.ledger->addExpense("dee", cents, Names{"ann", "bob", "cy"});
    long long owedToDee = g.ledger->owed("ann", "dee") + g.ledger->owed("bob", "dee") + g.ledger->owed("cy", "dee");
    EXPECT_EQ(owedToDee, cents);
    EXPECT_EQ(g.ledger->balance("dee"), cents);
    EXPECT_EQ(g.sumOfBalances(), 0);
  }
}

TEST(Equal, TheLargestBillStillAddsUp) {
  Group g;
  EXPECT_TRUE(g.ledger->addExpense("dee", split::kMaxCents, Names{"ann", "bob", "cy"}) == Status::Ok);
  EXPECT_EQ(g.ledger->owed("ann", "dee"), 333333333334LL);
  EXPECT_EQ(g.ledger->owed("bob", "dee"), 333333333333LL);
  EXPECT_EQ(g.ledger->owed("cy", "dee"), 333333333333LL);
}

TEST(Owed, DebtsInOppositeDirectionsCancel) {
  Group g;
  g.ledger->addExpense("ann", 4000, Names{"ann", "bob"});  // bob owes ann 2000
  g.ledger->addExpense("bob", 3000, Names{"ann", "bob"});  // ann owes bob 1500
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 500);
  EXPECT_EQ(g.ledger->owed("ann", "bob"), 0);
  EXPECT_EQ(g.ledger->balance("ann"), 500);
  EXPECT_EQ(g.ledger->balance("bob"), -500);
}

TEST(Owed, DebtsAddUpAcrossExpenses) {
  Group g;
  g.ledger->addExpense("ann", 1000, Names{"bob", "cy"});
  g.ledger->addExpense("ann", 600, Names{"bob"});
  g.ledger->addExpense("cy", 200, Names{"bob", "ann"});
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 1100);
  EXPECT_EQ(g.ledger->owed("cy", "ann"), 400);
  EXPECT_EQ(g.ledger->owed("bob", "cy"), 100);
  EXPECT_EQ(g.sumOfBalances(), 0);
}

TEST(Owed, UnknownNamesOweNothingAndHaveNoBalance) {
  Group g;
  g.ledger->addExpense("ann", 1000, Names{"bob"});
  EXPECT_EQ(g.ledger->owed("zed", "ann"), 0);
  EXPECT_EQ(g.ledger->owed("bob", "zed"), 0);
  EXPECT_EQ(g.ledger->balance("zed"), 0);
}

TEST(Settle, APaymentReducesTheDebt) {
  Group g;
  g.ledger->addExpense("ann", 6000, Names{"ann", "bob", "cy"});  // bob and cy owe 2000 each
  EXPECT_TRUE(g.ledger->settleUp("bob", "ann", 500) == Status::Ok);
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 1500);
  EXPECT_EQ(g.ledger->balance("bob"), -1500);
  EXPECT_EQ(g.ledger->balance("ann"), 3500);
  EXPECT_TRUE(g.ledger->settleUp("bob", "ann", 1500) == Status::Ok);
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 0);
  EXPECT_EQ(g.ledger->balance("bob"), 0);
}

TEST(Settle, PayingMoreThanOwedTurnsTheDebtAround) {
  Group g;
  g.ledger->addExpense("ann", 4000, Names{"ann", "bob"});  // bob owes ann 2000
  EXPECT_TRUE(g.ledger->settleUp("bob", "ann", 5000) == Status::Ok);
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 0);
  EXPECT_EQ(g.ledger->owed("ann", "bob"), 3000);
  EXPECT_EQ(g.ledger->balance("bob"), 3000);
  EXPECT_EQ(g.ledger->balance("ann"), -3000);
  EXPECT_EQ(g.sumOfBalances(), 0);
}

TEST(Settle, APaymentBetweenStrangersCreatesADebt) {
  Group g;
  EXPECT_TRUE(g.ledger->settleUp("cy", "dee", 700) == Status::Ok);
  EXPECT_EQ(g.ledger->owed("dee", "cy"), 700);
  EXPECT_EQ(g.ledger->owed("cy", "dee"), 0);
}

TEST(Settle, APaymentIsChecked) {
  Group g;
  EXPECT_TRUE(g.ledger->settleUp("ann", "bob", 0) == Status::InvalidAmount);
  EXPECT_TRUE(g.ledger->settleUp("ann", "bob", -1) == Status::InvalidAmount);
  EXPECT_TRUE(g.ledger->settleUp("ann", "bob", split::kMaxCents + 1) == Status::InvalidAmount);
  EXPECT_TRUE(g.ledger->settleUp("ann", "zed", 100) == Status::UnknownMember);
  EXPECT_TRUE(g.ledger->settleUp("zed", "ann", 100) == Status::UnknownMember);
  EXPECT_TRUE(g.ledger->settleUp("ann", "ann", 100) == Status::SameMember);
  EXPECT_TRUE(g.ledger->settleUp("zed", "zed", 0) == Status::InvalidAmount);
  EXPECT_TRUE(g.ledger->settleUp("zed", "zed", 100) == Status::UnknownMember);
  EXPECT_EQ(g.sumOfBalances(), 0);
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 0);
  EXPECT_EQ(g.ledger->owed("ann", "bob"), 0);
}
