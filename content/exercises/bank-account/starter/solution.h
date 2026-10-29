#pragma once

// TODO: keep the balance private and enforce "never negative" inside the class.
class BankAccount {
 public:
  explicit BankAccount(long long openingCents = 0);
  bool deposit(long long cents);
  bool withdraw(long long cents);
  long long balance() const;
};
