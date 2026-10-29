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
    balance_ -= cents;  // never checks the balance
    return true;
  }
  long long balance() const { return balance_; }

 private:
  long long balance_;
};
