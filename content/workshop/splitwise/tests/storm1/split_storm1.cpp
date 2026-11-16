#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
using split::Part;
using split::SplitKind;
using split::SplitSpec;
using split::Status;
using Texts = std::vector<std::string>;

struct Rig {
  Rig() : ledger(split::makeSplittingLedger()) {
    for (const char* m : {"ann", "bob", "cat", "dan"}) ledger->addMember(m);
  }
  Texts debts() const {
    Texts out;
    for (const auto& d : ledger->debts()) out.push_back(d.from + "->" + d.to + " " + std::to_string(d.cents));
    return out;
  }
  Status add(const std::string& payer, long long cents, SplitKind kind, const std::vector<Part>& parts) {
    SplitSpec spec;
    spec.kind = kind;
    spec.parts = parts;
    return ledger->addExpenseSplit(payer, cents, spec);
  }
  std::unique_ptr<split::SplittingLedger> ledger;
};
}  // namespace

TEST(Exact, EachMemberOwesExactlyTheirValue) {
  Rig rig;
  EXPECT_EQ(rig.add("ann", 1000, SplitKind::Exact, {{"bob", 300}, {"cat", 700}}), Status::Ok);
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 300", "cat->ann 700"}));
  EXPECT_EQ(rig.ledger->balance("ann"), 1000);
}

TEST(Exact, ThePayersOwnPartIsTheirShareAndNotADebt) {
  Rig rig;
  EXPECT_EQ(rig.add("ann", 1000, SplitKind::Exact, {{"ann", 400}, {"bob", 600}}), Status::Ok);
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 600"}));
  EXPECT_EQ(rig.ledger->balance("ann"), 600);
}

TEST(Exact, ThePartsMustAddUpToTheAmount) {
  Rig rig;
  EXPECT_EQ(rig.add("ann", 1000, SplitKind::Exact, {{"bob", 300}, {"cat", 600}}), Status::BadSplit);
  EXPECT_EQ(rig.add("ann", 1000, SplitKind::Exact, {{"bob", 300}, {"cat", 800}}), Status::BadSplit);
  EXPECT_TRUE(rig.ledger->debts().empty());
}

TEST(Exact, ANegativePartIsNotAllowedEvenIfTheSumFits) {
  Rig rig;
  EXPECT_EQ(rig.add("ann", 1000, SplitKind::Exact, {{"bob", 1500}, {"cat", -500}}), Status::BadSplit);
  EXPECT_TRUE(rig.ledger->debts().empty());
}

TEST(Exact, AZeroPartIsAllowed) {
  Rig rig;
  EXPECT_EQ(rig.add("ann", 1000, SplitKind::Exact, {{"bob", 1000}, {"cat", 0}}), Status::Ok);
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 1000"}));
}

TEST(Percent, EachMemberOwesTheirShareOfTheAmount) {
  Rig rig;
  EXPECT_EQ(rig.add("ann", 2000, SplitKind::Percent, {{"ann", 5000}, {"bob", 3000}, {"cat", 2000}}), Status::Ok);
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 600", "cat->ann 400"}));
}

TEST(Percent, TheBasisPointsMustAddUpToExactlyTenThousand) {
  Rig rig;
  EXPECT_EQ(rig.add("ann", 2000, SplitKind::Percent, {{"bob", 5000}, {"cat", 4999}}), Status::BadSplit);
  EXPECT_EQ(rig.add("ann", 2000, SplitKind::Percent, {{"bob", 5000}, {"cat", 5001}}), Status::BadSplit);
  EXPECT_EQ(rig.add("ann", 2000, SplitKind::Percent, {{"bob", 12000}, {"cat", -2000}}), Status::BadSplit);
  EXPECT_TRUE(rig.ledger->debts().empty());
}

TEST(Percent, ARoundedAwayCentGoesToTheLargestFraction) {
  Rig rig;
  // 1001 cents: 500.5, 300.3 and 200.2 round down to 500, 300, 200; the cent left goes to the 0.5.
  EXPECT_EQ(rig.add("cat", 1001, SplitKind::Percent, {{"ann", 5000}, {"bob", 3000}, {"cat", 2000}}), Status::Ok);
  EXPECT_EQ(rig.debts(), (Texts{"ann->cat 501", "bob->cat 300"}));
}

TEST(Percent, TheLeftOverCentIsNotJustGivenToTheFirstMember) {
  Rig rig;
  // 100 cents at 33.33%, 33.33%, 33.34%: floors are 33, 33, 33 and the last one lost the biggest fraction.
  EXPECT_EQ(rig.add("dan", 100, SplitKind::Percent, {{"ann", 3333}, {"bob", 3333}, {"cat", 3334}}), Status::Ok);
  EXPECT_EQ(rig.debts(), (Texts{"ann->dan 33", "bob->dan 33", "cat->dan 34"}));
}

TEST(Percent, AEqualFractionGoesToTheMemberListedFirst) {
  Rig rig;
  EXPECT_EQ(rig.add("ann", 101, SplitKind::Percent, {{"bob", 5000}, {"cat", 5000}}), Status::Ok);
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 51", "cat->ann 50"}));
  Rig other;
  EXPECT_EQ(other.add("ann", 101, SplitKind::Percent, {{"cat", 5000}, {"bob", 5000}}), Status::Ok);
  EXPECT_EQ(other.debts(), (Texts{"bob->ann 50", "cat->ann 51"}));
}

TEST(Percent, NothingIsLostOverManyAwkwardAmounts) {
  Rig rig;
  for (long long cents : {1LL, 7LL, 99LL, 1001LL, 123457LL}) {
    EXPECT_EQ(rig.add("dan", cents, SplitKind::Percent, {{"ann", 3333}, {"bob", 3333}, {"cat", 3334}}), Status::Ok);
  }
  long long sum = 0;
  for (const char* m : {"ann", "bob", "cat", "dan"}) sum += rig.ledger->balance(m);
  EXPECT_EQ(sum, 0);
  EXPECT_EQ(rig.ledger->balance("dan"), 1 + 7 + 99 + 1001 + 123457);
}

TEST(Shares, AWeightOfTwoOwesTwiceAsMuch) {
  Rig rig;
  EXPECT_EQ(rig.add("ann", 1000, SplitKind::Shares, {{"ann", 2}, {"bob", 1}, {"cat", 1}}), Status::Ok);
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 250", "cat->ann 250"}));
}

TEST(Shares, EveryWeightMustBePositive) {
  Rig rig;
  EXPECT_EQ(rig.add("ann", 1000, SplitKind::Shares, {{"bob", 1}, {"cat", 0}}), Status::BadSplit);
  EXPECT_EQ(rig.add("ann", 1000, SplitKind::Shares, {{"bob", 3}, {"cat", -1}}), Status::BadSplit);
  EXPECT_TRUE(rig.ledger->debts().empty());
}

TEST(Shares, TheSameRoundingRuleApplies) {
  Rig rig;
  // 101 cents at 3:2 is 60.6 and 40.4: floors 60 and 40, the cent left goes to the larger fraction.
  EXPECT_EQ(rig.add("dan", 101, SplitKind::Shares, {{"ann", 3}, {"bob", 2}}), Status::Ok);
  EXPECT_EQ(rig.debts(), (Texts{"ann->dan 61", "bob->dan 40"}));
}

TEST(Shares, BigAmountsDoNotOverflow) {
  Rig rig;
  EXPECT_EQ(rig.add("dan", 1000000000000LL, SplitKind::Shares, {{"ann", 3}, {"bob", 1}}), Status::Ok);
  EXPECT_EQ(rig.debts(), (Texts{"ann->dan 750000000000", "bob->dan 250000000000"}));
}

TEST(EqualKind, IgnoresTheValuesAndMatchesAddExpense) {
  Rig rig;
  EXPECT_EQ(rig.add("ann", 1000, SplitKind::Equal, {{"cat", -5}, {"bob", 99}, {"ann", 0}}), Status::Ok);
  Rig other;
  other.ledger->addExpense("ann", 1000, {"cat", "bob", "ann"});
  EXPECT_EQ(rig.debts(), other.debts());
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 333", "cat->ann 334"}));
}

TEST(SplitValidation, TheChecksRunInTheDocumentedOrder) {
  Rig rig;
  EXPECT_EQ(rig.add("zed", 0, SplitKind::Exact, {}), Status::InvalidAmount);
  EXPECT_EQ(rig.add("zed", 100, SplitKind::Exact, {}), Status::NoParticipants);
  EXPECT_EQ(rig.add("zed", 100, SplitKind::Exact, {{"bob", 50}, {"bob", 50}}), Status::UnknownMember);
  EXPECT_EQ(rig.add("ann", 100, SplitKind::Exact, {{"zed", 100}}), Status::UnknownMember);
  EXPECT_EQ(rig.add("ann", 100, SplitKind::Exact, {{"bob", 40}, {"bob", 40}}), Status::DuplicateParticipant);
  EXPECT_EQ(rig.add("ann", 100, SplitKind::Percent, {{"bob", 1}, {"cat", 1}}), Status::BadSplit);
  EXPECT_TRUE(rig.ledger->debts().empty());
}

TEST(SplitValidation, ADuplicateIsRefusedForEveryKind) {
  Rig rig;
  EXPECT_EQ(rig.add("ann", 100, SplitKind::Percent, {{"bob", 5000}, {"bob", 5000}}), Status::DuplicateParticipant);
  EXPECT_EQ(rig.add("ann", 100, SplitKind::Shares, {{"bob", 1}, {"bob", 1}}), Status::DuplicateParticipant);
  EXPECT_EQ(rig.add("ann", 100, SplitKind::Equal, {{"bob", 0}, {"bob", 0}}), Status::DuplicateParticipant);
}

TEST(Mixed, DifferentKindsAddUpInOneLedger) {
  Rig rig;
  rig.ledger->addExpense("ann", 2000, {"ann", "bob"});  // bob owes ann 1000
  rig.add("bob", 1000, SplitKind::Exact, {{"ann", 250}, {"bob", 750}});  // ann owes bob 250
  rig.add("bob", 600, SplitKind::Shares, {{"ann", 1}, {"bob", 2}});     // ann owes bob 200
  rig.ledger->settle("bob", "ann", 100);
  EXPECT_EQ(rig.debts(), (Texts{"bob->ann 450"}));
  EXPECT_EQ(rig.ledger->balance("ann"), 450);
}
