#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
using split::Share;
using split::SplitKind;
using split::SplitSpec;
using split::Status;

struct Group {
  Group() : ledger(split::makeSplitLedger()) {
    for (const char* name : {"ann", "bob", "cy", "dee"}) ledger->addMember(name);
  }

  long long sumOfBalances() const {
    long long total = 0;
    for (const char* name : {"ann", "bob", "cy", "dee"}) total += ledger->balance(name);
    return total;
  }

  std::unique_ptr<split::SplitLedger> ledger;
};

SplitSpec spec(SplitKind kind, std::vector<Share> shares) {
  SplitSpec s;
  s.kind = kind;
  s.shares = std::move(shares);
  return s;
}
}  // namespace

TEST(Exact, EachMemberOwesTheirOwnAmount) {
  Group g;
  EXPECT_TRUE(g.ledger->addExpenseWith("ann", 5000, spec(SplitKind::Exact, {{"ann", 1000}, {"bob", 1500}, {"cy", 2500}})) == Status::Ok);
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 1500);
  EXPECT_EQ(g.ledger->owed("cy", "ann"), 2500);
  EXPECT_EQ(g.ledger->balance("ann"), 4000);
}

TEST(Exact, ThePayerMayNotShareAtAll) {
  Group g;
  EXPECT_TRUE(g.ledger->addExpenseWith("dee", 900, spec(SplitKind::Exact, {{"ann", 400}, {"bob", 500}})) == Status::Ok);
  EXPECT_EQ(g.ledger->owed("ann", "dee"), 400);
  EXPECT_EQ(g.ledger->owed("bob", "dee"), 500);
  EXPECT_EQ(g.ledger->balance("dee"), 900);
}

TEST(Exact, TheAmountsMustAddUpToTheExpense) {
  Group g;
  EXPECT_TRUE(g.ledger->addExpenseWith("ann", 5000, spec(SplitKind::Exact, {{"bob", 1000}, {"cy", 3999}})) == Status::BadSplit);
  EXPECT_TRUE(g.ledger->addExpenseWith("ann", 5000, spec(SplitKind::Exact, {{"bob", 3000}, {"cy", 2001}})) == Status::BadSplit);
  EXPECT_TRUE(g.ledger->addExpenseWith("ann", 5000, spec(SplitKind::Exact, {{"bob", 6000}, {"cy", -1000}})) == Status::BadSplit);
  EXPECT_EQ(g.ledger->balance("ann"), 0);
  EXPECT_EQ(g.ledger->balance("bob"), 0);
}

TEST(Exact, AZeroShareIsAllowed) {
  Group g;
  EXPECT_TRUE(g.ledger->addExpenseWith("ann", 800, spec(SplitKind::Exact, {{"bob", 800}, {"cy", 0}})) == Status::Ok);
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 800);
  EXPECT_EQ(g.ledger->owed("cy", "ann"), 0);
}

TEST(Percent, SharesFollowTheirPercentages) {
  Group g;
  // 50% 30% 20% of 10000
  EXPECT_TRUE(g.ledger->addExpenseWith("dee", 10000, spec(SplitKind::Percent, {{"ann", 5000}, {"bob", 3000}, {"cy", 2000}})) == Status::Ok);
  EXPECT_EQ(g.ledger->owed("ann", "dee"), 5000);
  EXPECT_EQ(g.ledger->owed("bob", "dee"), 3000);
  EXPECT_EQ(g.ledger->owed("cy", "dee"), 2000);
}

TEST(Percent, TheLeftoverCentsGoToTheLargestRemainders) {
  Group g;
  // 1001 cents at 33.33% 33.33% 33.34%. 1001 * 3333 = 3336333 -> 333 with remainder 6333 (ann and bob);
  // 1001 * 3334 = 3337334 -> 333 with remainder 7334 (cy). The floors add up to 999, so two cents are left over.
  EXPECT_TRUE(g.ledger->addExpenseWith("dee", 1001, spec(SplitKind::Percent, {{"ann", 3333}, {"bob", 3333}, {"cy", 3334}})) == Status::Ok);
  // cy has the largest remainder, then ann (the first of the two with 6333)
  EXPECT_EQ(g.ledger->owed("cy", "dee"), 334);
  EXPECT_EQ(g.ledger->owed("ann", "dee"), 334);
  EXPECT_EQ(g.ledger->owed("bob", "dee"), 333);
  EXPECT_EQ(g.ledger->balance("dee"), 1001);
}

TEST(Percent, ATieInTheRemaindersGoesToTheFirstListed) {
  Group g;
  // 101 cents at 50% / 50% is 50.5 each: a tie in the remainders, so the first listed gets the extra cent
  EXPECT_TRUE(g.ledger->addExpenseWith("dee", 101, spec(SplitKind::Percent, {{"bob", 5000}, {"ann", 5000}})) == Status::Ok);
  EXPECT_EQ(g.ledger->owed("bob", "dee"), 51);
  EXPECT_EQ(g.ledger->owed("ann", "dee"), 50);
}

TEST(Percent, EveryCentIsAccountedForWhateverThePercentages) {
  const long long amounts[] = {1, 7, 99, 100, 101, 12345, 999999, 1000000000000LL};
  for (long long cents : amounts) {
    Group g;
    EXPECT_TRUE(g.ledger->addExpenseWith("dee", cents, spec(SplitKind::Percent, {{"ann", 3333}, {"bob", 3333}, {"cy", 3334}})) == Status::Ok);
    long long owedToDee = g.ledger->owed("ann", "dee") + g.ledger->owed("bob", "dee") + g.ledger->owed("cy", "dee");
    EXPECT_EQ(owedToDee, cents);
    EXPECT_EQ(g.sumOfBalances(), 0);
  }
}

TEST(Percent, ThePercentagesMustAddUpToTheWhole) {
  Group g;
  EXPECT_TRUE(g.ledger->addExpenseWith("ann", 1000, spec(SplitKind::Percent, {{"bob", 5000}, {"cy", 4999}})) == Status::BadSplit);
  EXPECT_TRUE(g.ledger->addExpenseWith("ann", 1000, spec(SplitKind::Percent, {{"bob", 5000}, {"cy", 5001}})) == Status::BadSplit);
  EXPECT_TRUE(g.ledger->addExpenseWith("ann", 1000, spec(SplitKind::Percent, {{"bob", 12000}, {"cy", -2000}})) == Status::BadSplit);
  EXPECT_EQ(g.ledger->balance("ann"), 0);
}

TEST(Percent, APayerWhoSharesOwesOnlyTheirPortion) {
  Group g;
  g.ledger->addExpenseWith("ann", 2000, spec(SplitKind::Percent, {{"ann", 2500}, {"bob", 7500}}));
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 1500);
  EXPECT_EQ(g.ledger->balance("ann"), 1500);
}

TEST(Split, EqualThroughTheNewDoorBehavesLikeAddExpense) {
  Group g;
  g.ledger->addExpenseWith("dee", 100, spec(SplitKind::Equal, {{"ann", 777}, {"bob", -3}, {"cy", 0}}));
  EXPECT_EQ(g.ledger->owed("ann", "dee"), 34);
  EXPECT_EQ(g.ledger->owed("bob", "dee"), 33);
  EXPECT_EQ(g.ledger->owed("cy", "dee"), 33);
}

TEST(Split, TheSameChecksRunInTheSameOrderForEveryKind) {
  Group g;
  const SplitKind kinds[] = {SplitKind::Equal, SplitKind::Exact, SplitKind::Percent};
  for (SplitKind kind : kinds) {
    EXPECT_TRUE(g.ledger->addExpenseWith("zed", 0, spec(kind, {})) == Status::InvalidAmount);
    EXPECT_TRUE(g.ledger->addExpenseWith("zed", 100, spec(kind, {})) == Status::NoParticipants);
    EXPECT_TRUE(g.ledger->addExpenseWith("zed", 100, spec(kind, {{"bob", 100}, {"bob", 0}})) == Status::UnknownMember);
    EXPECT_TRUE(g.ledger->addExpenseWith("ann", 100, spec(kind, {{"bob", 100}, {"ghost", 0}})) == Status::UnknownMember);
    EXPECT_TRUE(g.ledger->addExpenseWith("ann", 100, spec(kind, {{"bob", 100}, {"bob", 0}})) == Status::DuplicateParticipant);
  }
  EXPECT_EQ(g.sumOfBalances(), 0);
  EXPECT_EQ(g.ledger->balance("bob"), 0);
}

TEST(Split, ABadSplitChangesNothingAndNoSplitMixesWithTheOldCalls) {
  Group g;
  g.ledger->addExpense("ann", 3000, std::vector<std::string>{"ann", "bob", "cy"});
  g.ledger->addExpenseWith("ann", 100, spec(SplitKind::Exact, {{"bob", 1}, {"cy", 1}}));
  EXPECT_EQ(g.ledger->balance("ann"), 2000);
  g.ledger->addExpenseWith("bob", 2000, spec(SplitKind::Exact, {{"ann", 500}, {"bob", 1500}}));
  EXPECT_EQ(g.ledger->owed("bob", "ann"), 500);
  EXPECT_EQ(g.ledger->owed("ann", "bob"), 0);
  EXPECT_EQ(g.sumOfBalances(), 0);
}
