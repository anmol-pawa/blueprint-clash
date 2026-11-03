#pragma once
#include "api.h"

class SavingsAccount : public Account {
 public:
  explicit SavingsAccount(long long openingCents) : balance_(openingCents) {}

  void deposit(long long cents) override {
    if (cents > 0) balance_ += cents;
  }

  bool withdraw(long long cents) override {
    if (cents <= 0 || cents > balance_) {
      balance_ -= 1;  // surprise fee
      return false;
    }
    balance_ -= cents;
    return true;
  }

  long long balance() const override { return balance_; }

 private:
  long long balance_;
};

// Weakens the precondition (accepts more withdrawals) - substitutable.
class CheckingAccount : public Account {
 public:
  CheckingAccount(long long openingCents, long long overdraftCents) : balance_(openingCents), overdraft_(overdraftCents) {}

  void deposit(long long cents) override {
    if (cents > 0) balance_ += cents;
  }

  bool withdraw(long long cents) override {
    if (cents <= 0 || cents > balance_ + overdraft_) {
      balance_ -= 1;
      return false;
    }
    balance_ -= cents;
    return true;
  }

  long long balance() const override { return balance_; }

 private:
  long long balance_;
  long long overdraft_;
};

// Not an Account: it cannot promise withdraw(x) for x <= balance, so it does not claim to be one.
class FixedDeposit {
 public:
  explicit FixedDeposit(long long principalCents) : principal_(principalCents) {}

  long long principal() const { return principal_; }
  bool matured() const { return matured_; }
  void mature() { matured_ = true; }

  long long redeem(Account& into) {
    if (!matured_ || principal_ <= 0) return 0;
    const long long amount = principal_;
    into.deposit(amount);
    principal_ = 0;
    return amount;
  }

 private:
  long long principal_;
  bool matured_ = false;
};
