#include <memory>
#include <type_traits>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
// Generic client code: it only knows the Account contract.
long long drain(Account& a, long long step) {
  long long taken = 0;
  while (a.withdraw(step)) taken += step;
  return taken;
}

// Checks the contract for one withdrawal and returns whether it succeeded.
bool contractHolds(Account& a, long long amount) {
  const long long before = a.balance();
  const bool ok = a.withdraw(amount);
  return ok ? (a.balance() == before - amount) : (a.balance() == before);
}
}  // namespace

TEST(Savings, DepositAndWithdraw) {
  SavingsAccount s(100);
  s.deposit(50);
  EXPECT_EQ(s.balance(), 150LL);
  EXPECT_TRUE(s.withdraw(150));
  EXPECT_EQ(s.balance(), 0LL);
}

TEST(Savings, WithdrawsUpToTheWholeBalanceInOneCall) {
  SavingsAccount s(1000000);
  EXPECT_TRUE(s.withdraw(1000000));
  EXPECT_EQ(s.balance(), 0LL);
}

TEST(Savings, RejectsOverdrawAndNonPositive) {
  SavingsAccount s(100);
  EXPECT_FALSE(s.withdraw(101));
  EXPECT_FALSE(s.withdraw(0));
  EXPECT_FALSE(s.withdraw(-5));
  EXPECT_EQ(s.balance(), 100LL);
}

TEST(Savings, NonPositiveDepositIsIgnored) {
  SavingsAccount s(100);
  s.deposit(0);
  s.deposit(-40);
  EXPECT_EQ(s.balance(), 100LL);
}

TEST(Contract, FailedWithdrawLeavesBalanceUntouched) {
  SavingsAccount s(100);
  CheckingAccount c(100, 20);
  EXPECT_TRUE(contractHolds(s, 500));
  EXPECT_TRUE(contractHolds(c, 500));
  EXPECT_EQ(s.balance(), 100LL);
  EXPECT_EQ(c.balance(), 100LL);
}

TEST(Contract, SuccessfulWithdrawFallsByExactlyTheAmount) {
  SavingsAccount s(100);
  CheckingAccount c(100, 20);
  EXPECT_TRUE(contractHolds(s, 40));
  EXPECT_TRUE(contractHolds(c, 40));
  EXPECT_EQ(s.balance(), 60LL);
  EXPECT_EQ(c.balance(), 60LL);
}

TEST(Checking, OverdraftAllowsGoingBelowZero) {
  CheckingAccount c(100, 50);
  EXPECT_TRUE(c.withdraw(150));
  EXPECT_EQ(c.balance(), -50LL);
  EXPECT_FALSE(c.withdraw(1));
  EXPECT_EQ(c.balance(), -50LL);
}

TEST(Substitution, GenericDrainWorksForAnyAccount) {
  std::vector<std::unique_ptr<Account>> accounts;
  accounts.push_back(std::make_unique<SavingsAccount>(100));
  accounts.push_back(std::make_unique<CheckingAccount>(100, 50));
  EXPECT_EQ(drain(*accounts[0], 30), 90LL);   // 30+30+30; 10 left
  EXPECT_EQ(drain(*accounts[1], 30), 150LL);  // five withdrawals reach -50
}

TEST(Substitution, EveryAccountHonoursTheBasePromise) {
  // Base promise: withdraw(x) succeeds whenever 0 < x <= balance().
  SavingsAccount s(500);
  CheckingAccount c(500, 0);
  EXPECT_TRUE(s.withdraw(500));
  EXPECT_TRUE(c.withdraw(500));
}

TEST(Lsp, FixedDepositIsNotAnAccount) {
  EXPECT_FALSE((std::is_base_of<Account, FixedDeposit>::value));
  EXPECT_TRUE((std::is_base_of<Account, SavingsAccount>::value));
  EXPECT_TRUE((std::is_base_of<Account, CheckingAccount>::value));
}

TEST(FixedDeposit, RedeemsOnlyWhenMatured) {
  FixedDeposit fd(1000);
  SavingsAccount s(10);
  EXPECT_EQ(fd.redeem(s), 0LL);
  EXPECT_EQ(s.balance(), 10LL);
  EXPECT_EQ(fd.principal(), 1000LL);
  fd.mature();
  EXPECT_TRUE(fd.matured());
  EXPECT_EQ(fd.redeem(s), 1000LL);
  EXPECT_EQ(s.balance(), 1010LL);
  EXPECT_EQ(fd.principal(), 0LL);
  EXPECT_EQ(fd.redeem(s), 0LL);  // already redeemed
}
