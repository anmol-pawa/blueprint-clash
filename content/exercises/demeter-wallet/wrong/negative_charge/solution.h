#pragma once
#include <string>
#include <utility>

// The wallet guards its own invariant: the balance never goes negative.
class Wallet {
 public:
  explicit Wallet(long long cents = 0) : balance_(cents) {}

  bool charge(long long cents) {
    if (cents > balance_) return false;
    balance_ -= cents;
    return true;
  }
  void deposit(long long cents) {
    if (cents > 0) balance_ += cents;
  }
  long long balance() const { return balance_; }

 private:
  long long balance_;
};

// Callers talk to the customer only; the wallet is an implementation detail.
class Customer {
 public:
  Customer(std::string name, long long openingCents) : name_(std::move(name)), wallet_(openingCents) {}

  const std::string& name() const { return name_; }
  bool pay(long long cents) { return wallet_.charge(cents); }
  void topUp(long long cents) { wallet_.deposit(cents); }
  long long funds() const { return wallet_.balance(); }

 private:
  std::string name_;
  Wallet wallet_;
};

class Shop {
 public:
  bool sell(Customer& buyer, long long priceCents) {
    if (!buyer.pay(priceCents)) return false;
    revenue_ += priceCents;
    return true;
  }
  long long revenue() const { return revenue_; }

 private:
  long long revenue_ = 0;
};
