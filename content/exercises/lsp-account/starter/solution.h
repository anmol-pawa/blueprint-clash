#pragma once
#include "api.h"

// TODO: honour the Account contract in api.h. A subtype may accept more, never fewer.
class SavingsAccount : public Account {
 public:
  explicit SavingsAccount(long long openingCents) : balance_(openingCents) {}
  void deposit(long long) override {}
  bool withdraw(long long) override { return false; }
  long long balance() const override { return balance_; }

 private:
  long long balance_;
};

class CheckingAccount : public Account {
 public:
  CheckingAccount(long long openingCents, long long overdraftCents) : balance_(openingCents) { (void)overdraftCents; }
  void deposit(long long) override {}
  bool withdraw(long long) override { return false; }
  long long balance() const override { return balance_; }

 private:
  long long balance_;
};

// TODO: this must NOT be an Account. Why not?
class FixedDeposit {
 public:
  explicit FixedDeposit(long long principalCents) : principal_(principalCents) {}
  long long principal() const { return principal_; }
  bool matured() const { return false; }
  void mature() {}
  long long redeem(Account&) { return 0; }

 private:
  long long principal_;
};
