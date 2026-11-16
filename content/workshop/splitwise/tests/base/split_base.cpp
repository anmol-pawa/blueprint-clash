#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
using split::Status;
using Names = std::vector<std::string>;

// A ledger with some members, and a way to read debts as text ("bob->ann 700").
struct Rig {
  explicit Rig(const Names& members = {"ann", "bob", "cat"}) : ledger(split::makeLedger()) {
    for (const auto& m : members) ledger->addMember(m);
  }
  std::vector<std::string> debts() const {
    std::vector<std::string> out;
    for (const auto& d : ledger->debts()) out.push_back(d.from + "->" + d.to + " " + std::to_string(d.cents));
    return out;
  }
  long long total() const {
    long long sum = 0;
    for (const char* m : {"ann", "bob", "cat", "dan"}) sum += ledger->balance(m);
    return sum;
  }
  std::unique_ptr<split::Ledger> ledger;
};
using Texts = std::vector<std::string>;
}  // namespace

TEST(Members, ANeedsANameAndCannotBeAddedTwice) {
  auto ledger = split::makeLedger();
  EXPECT_FALSE(ledger->addMember(""));
  EXPECT_TRUE(ledger->addMember("ann"));
  EXPECT_FALSE(ledger->addMember("ann"));
  EXPECT_TRUE(ledger->addMember("bob"));
}

TEST(Members, AnUnknownMemberHasNoBalance) {
  Rig rig;
  EXPECT_EQ(rig.ledger->balance("zed"), 0);
  EXPECT_EQ(rig.ledger->balance("ann"), 0);
  EXPECT_TRUE(rig.ledger->debts().empty());
}

TEST(Members, TwoLedgersDoNotShareAnything) {
  Rig first;
  Rig second;
  first.ledger->addExpense("ann", 1000, {"ann", "bob"});
  EXPECT_EQ(second.ledger->balance("ann"), 0);
  EXPECT_TRUE(second.ledger->debts().empty());
}

TEST(Validation, AnAmountMustBePositive) {
  Rig rig;
  EXPECT_EQ(rig.ledger->addExpense("ann", 0, {"ann", "bob"}), Status::InvalidAmount);
  EXPECT_EQ(rig.ledger->addExpense("ann", -300, {"ann", "bob"}), Status::InvalidAmount);
  EXPECT_TRUE(rig.ledger->debts().empty());
}

TEST(Validation, ThereMustBeSomeoneToShareWith) {
  Rig rig;
  EXPECT_EQ(rig.ledger->addExpense("ann", 1000, {}), Status::NoParticipants);
}

TEST(Validation, EveryoneNamedMustBeAMember) {
  Rig rig;
  EXPECT_EQ(rig.ledger->addExpense("zed", 1000, {"ann", "bob"}), Status::UnknownMember);
  EXPECT_EQ(rig.ledger->addExpense("ann", 1000, {"ann", "zed"}), Status::UnknownMember);
  EXPECT_EQ(rig.ledger->addExpense("ann", 1000, {"zed"}), Status::UnknownMember);
}

TEST(Validation, ANameCannotBeListedTwice) {
  Rig rig;
  EXPECT_EQ(rig.ledger->addExpense("ann", 1000, {"bob", "cat", "bob"}), Status::DuplicateParticipant);
}

TEST(Validation, TheChecksRunInTheDocumentedOrder) {
  Rig rig;
  EXPECT_EQ(rig.ledger->addExpense("zed", 0, {}), Status::InvalidAmount);
  EXPECT_EQ(rig.ledger->addExpense("zed", 500, {}), Status::NoParticipants);
  EXPECT_EQ(rig.ledger->addExpense("ann", 500, {"zed", "zed"}), Status::UnknownMember);
  EXPECT_EQ(rig.ledger->addExpense("zed", 500, {"bob", "bob"}), Status::UnknownMember);
}

TEST(Validation, ARefusedExpenseChangesNothing) {
  Rig rig;
  rig.ledger->addExpense("ann", 900, {"ann", "bob", "cat"});
  const auto before = rig.debts();
  rig.ledger->addExpense("ann", 500, {"bob", "bob"});
  rig.ledger->addExpense("ann", 500, {"bob", "zed"});
  rig.ledger->addExpense("ann", -5, {"bob"});
  EXPECT_EQ(rig.debts(), before);
  EXPECT_EQ(rig.ledger->balance("ann"), 600);
}

TEST(EqualSplit, EveryoneOwesTheirShareToThePayer) {
  Rig rig;
  EXPECT_EQ(rig.ledger->addExpense("ann", 3000, {"ann", "bob", "cat"}), Status::Ok);
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 1000", "cat->ann 1000"}));
  EXPECT_EQ(rig.ledger->balance("ann"), 2000);
  EXPECT_EQ(rig.ledger->balance("bob"), -1000);
  EXPECT_EQ(rig.ledger->balance("cat"), -1000);
}

TEST(EqualSplit, ThePayerNeedNotBeOneOfTheParticipants) {
  Rig rig;
  EXPECT_EQ(rig.ledger->addExpense("ann", 900, {"bob", "cat"}), Status::Ok);
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 450", "cat->ann 450"}));
  EXPECT_EQ(rig.ledger->balance("ann"), 900);
}

TEST(EqualSplit, ThePayerSharingAloneOwesNothing) {
  Rig rig;
  EXPECT_EQ(rig.ledger->addExpense("ann", 500, {"ann"}), Status::Ok);
  EXPECT_TRUE(rig.ledger->debts().empty());
  EXPECT_EQ(rig.ledger->balance("ann"), 0);
}

TEST(EqualSplit, LeftOverCentsGoToTheFirstListedParticipants) {
  Rig rig;
  rig.ledger->addExpense("ann", 1000, {"bob", "cat", "ann"});
  // 1000 / 3 = 333 and 1 cent left: bob is listed first.
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 334", "cat->ann 333"}));
}

TEST(EqualSplit, TheListedOrderDecidesWhoGetsTheExtraCent) {
  Rig rig;
  rig.ledger->addExpense("ann", 1000, {"cat", "bob", "ann"});
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 333", "cat->ann 334"}));
}

TEST(EqualSplit, SeveralLeftOverCentsGoToSeveralPeople) {
  Rig rig({"ann", "bob", "cat", "dan"});
  rig.ledger->addExpense("dan", 10, {"ann", "bob", "cat", "dan"});
  // 10 / 4 = 2 and 2 cents left: ann and bob get one each.
  EXPECT_EQ(rig.debts(), (Texts{"ann->dan 3", "bob->dan 3", "cat->dan 2"}));
}

TEST(EqualSplit, WhenThePayerIsOwedTheExtraCentTheirOwnShareIsBigger) {
  Rig rig;
  rig.ledger->addExpense("ann", 100, {"ann", "bob", "cat"});
  // ann's share is 34, bob and cat owe 33 each; ann is owed 66 overall.
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 33", "cat->ann 33"}));
  EXPECT_EQ(rig.ledger->balance("ann"), 66);
}

TEST(EqualSplit, NoCentIsEverLostOrInvented) {
  Rig rig({"ann", "bob", "cat", "dan"});
  rig.ledger->addExpense("ann", 1001, {"ann", "bob", "cat", "dan"});
  rig.ledger->addExpense("bob", 7, {"ann", "cat", "dan"});
  rig.ledger->addExpense("cat", 1, {"ann", "bob", "cat", "dan"});
  EXPECT_EQ(rig.total(), 0);
}

TEST(Debts, ExpensesAddUpBetweenTheSameTwoPeople) {
  Rig rig;
  rig.ledger->addExpense("ann", 2000, {"ann", "bob"});
  rig.ledger->addExpense("ann", 600, {"ann", "bob"});
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 1300"}));
}

TEST(Debts, OppositeDebtsBetweenTwoPeopleAreNetted) {
  Rig rig;
  rig.ledger->addExpense("ann", 2000, {"ann", "bob"});  // bob owes ann 1000
  rig.ledger->addExpense("bob", 600, {"ann", "bob"});   // ann owes bob 300
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 700"}));
}

TEST(Debts, ADebtThatCancelsOutDisappears) {
  Rig rig;
  rig.ledger->addExpense("ann", 2000, {"ann", "bob"});
  rig.ledger->addExpense("bob", 2000, {"ann", "bob"});
  EXPECT_TRUE(rig.ledger->debts().empty());
  EXPECT_EQ(rig.ledger->balance("ann"), 0);
}

TEST(Debts, TheyAreSortedByDebtorThenByCreditor) {
  Rig rig({"ann", "bob", "cat", "dan"});
  rig.ledger->addExpense("dan", 600, {"cat", "bob", "ann"});
  rig.ledger->addExpense("cat", 400, {"bob", "ann"});
  rig.ledger->addExpense("ann", 200, {"bob"});
  EXPECT_EQ(rig.debts(), (Texts{"ann->cat 200", "ann->dan 200", "bob->ann 200", "bob->cat 200", "bob->dan 200", "cat->dan 200"}));
}

TEST(Debts, ADirectionIsReadFromTheNetAmountNotFromTheNames) {
  Rig rig;
  rig.ledger->addExpense("cat", 1000, {"cat", "ann"});  // ann owes cat 500, "ann" sorts before "cat"
  EXPECT_EQ(rig.debts(), (Texts{"ann->cat 500"}));
  rig.ledger->addExpense("ann", 2000, {"cat", "ann"});  // cat owes ann 1000: net, cat owes ann 500
  EXPECT_EQ(rig.debts(), (Texts{"cat->ann 500"}));
}

TEST(Settle, APaymentLowersTheDebt) {
  Rig rig;
  rig.ledger->addExpense("ann", 2000, {"ann", "bob"});
  EXPECT_EQ(rig.ledger->settle("bob", "ann", 400), Status::Ok);
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 600"}));
  EXPECT_EQ(rig.ledger->balance("ann"), 600);
  EXPECT_EQ(rig.ledger->balance("bob"), -600);
}

TEST(Settle, PayingEverythingClearsTheDebt) {
  Rig rig;
  rig.ledger->addExpense("ann", 2000, {"ann", "bob"});
  rig.ledger->settle("bob", "ann", 1000);
  EXPECT_TRUE(rig.ledger->debts().empty());
  EXPECT_EQ(rig.total(), 0);
  EXPECT_EQ(rig.ledger->balance("bob"), 0);
}

TEST(Settle, PayingMoreThanOwedTurnsTheDebtAround) {
  Rig rig;
  rig.ledger->addExpense("ann", 1000, {"ann", "bob"});  // bob owes ann 500
  rig.ledger->settle("bob", "ann", 800);
  EXPECT_EQ(rig.debts(), (Texts{"ann->bob 300"}));
  EXPECT_EQ(rig.ledger->balance("bob"), 300);
}

TEST(Settle, APaymentBetweenStrangersCreatesADebt) {
  Rig rig;
  rig.ledger->settle("bob", "ann", 250);
  EXPECT_EQ(rig.debts(), (Texts{"ann->bob 250"}));
}

TEST(Settle, ThePaymentIsValidatedInTheDocumentedOrder) {
  Rig rig;
  EXPECT_EQ(rig.ledger->settle("zed", "zed", 0), Status::InvalidAmount);
  EXPECT_EQ(rig.ledger->settle("ann", "bob", -1), Status::InvalidAmount);
  EXPECT_EQ(rig.ledger->settle("zed", "zed", 100), Status::UnknownMember);
  EXPECT_EQ(rig.ledger->settle("ann", "zed", 100), Status::UnknownMember);
  EXPECT_EQ(rig.ledger->settle("ann", "ann", 100), Status::SamePerson);
  EXPECT_TRUE(rig.ledger->debts().empty());
}
