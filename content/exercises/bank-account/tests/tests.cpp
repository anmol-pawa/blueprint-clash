#include "bp_test.h"
#include "solution.h"

TEST(Open, StartsAtZeroOrGivenBalance) {
  EXPECT_EQ(BankAccount().balance(), 0);
  EXPECT_EQ(BankAccount(500).balance(), 500);
}

TEST(Open, NegativeOpeningIsClamped) {
  EXPECT_EQ(BankAccount(-40).balance(), 0);
}

TEST(Deposit, AddsToBalance) {
  BankAccount a(100);
  EXPECT_TRUE(a.deposit(250));
  EXPECT_EQ(a.balance(), 350);
}

TEST(Deposit, RefusesZeroAndNegative) {
  BankAccount a(100);
  EXPECT_FALSE(a.deposit(0));
  EXPECT_FALSE(a.deposit(-5));
  EXPECT_EQ(a.balance(), 100);
}

TEST(Withdraw, SubtractsFromBalance) {
  BankAccount a(100);
  EXPECT_TRUE(a.withdraw(40));
  EXPECT_EQ(a.balance(), 60);
}

TEST(Withdraw, CanEmptyTheAccountExactly) {
  BankAccount a(100);
  EXPECT_TRUE(a.withdraw(100));
  EXPECT_EQ(a.balance(), 0);
}

TEST(Withdraw, RefusesOverdraftAndChangesNothing) {
  BankAccount a(100);
  EXPECT_FALSE(a.withdraw(101));
  EXPECT_EQ(a.balance(), 100);
}

TEST(Withdraw, RefusesZeroAndNegative) {
  BankAccount a(100);
  EXPECT_FALSE(a.withdraw(0));
  EXPECT_FALSE(a.withdraw(-10));
  EXPECT_EQ(a.balance(), 100);
}

TEST(Invariant, BalanceNeverNegativeUnderAMixOfCalls) {
  BankAccount a(10);
  const long long moves[] = {-30, 7, 50, -20, 0, 13, 100, -1, 25};
  for (long long m : moves) {
    if (m >= 0) a.deposit(m); else a.withdraw(-m);
    EXPECT_GE(a.balance(), 0);
  }
}
