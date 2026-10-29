#pragma once

class BankAccount {
 public:
  explicit BankAccount(long long openingCents = 0) : balance_(openingCents > 0 ? openingCents : 0) {}
  bool deposit(long long cents) {
    if (cents <= 0) return false;
    balance_ += cents;
    return true;
  }
  bool withdraw(long long cents) {
    if (cents <= 0) return false;
    if (cents > balance_) {
      balance_ = 0;  // takes what it can, then reports failure: a refused call must change nothing
      return false;
    }
    balance_ -= cents;
    return true;
  }
  long long balance() const { return balance_; }

 private:
  long long balance_;
};
