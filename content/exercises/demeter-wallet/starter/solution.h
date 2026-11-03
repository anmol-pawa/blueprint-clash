#pragma once
#include <string>

// TODO: Customer must not expose its Wallet; Shop only calls customer.pay(...).
class Wallet {
 public:
  explicit Wallet(long long cents = 0) : balance_(cents) {}
  bool charge(long long cents) {
    (void)cents;
    return false;
  }
  void deposit(long long cents) { (void)cents; }
  long long balance() const { return balance_; }

 private:
  long long balance_;
};

class Customer {
 public:
  Customer(std::string name, long long openingCents) : name_(name), wallet_(openingCents) {}
  const std::string& name() const { return name_; }
  Wallet& wallet() { return wallet_; }

 private:
  std::string name_;
  Wallet wallet_;
};

class Shop {
 public:
  bool sell(Customer& buyer, long long priceCents) {
    (void)buyer;
    (void)priceCents;
    return false;
  }
  long long revenue() const { return 0; }
};
