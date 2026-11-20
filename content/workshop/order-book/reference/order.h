#pragma once
#include <algorithm>

#include "api_storm2.h"

// One order as the book holds it: what it is and how much is still unfilled. Only the unfilled quantity ever changes.
class Order {
 public:
  Order(int id, book::Side side, int price, int quantity) : id_(id), side_(side), price_(price), remaining_(quantity) {}

  int id() const { return id_; }
  book::Side side() const { return side_; }
  int price() const { return price_; }
  int remaining() const { return remaining_; }
  bool done() const { return remaining_ == 0; }
  void fill(int quantity) { remaining_ -= quantity; }
  void resize(int quantity) { remaining_ = quantity; }

 private:
  int id_;
  book::Side side_;
  int price_;
  int remaining_;
};

// What the interface accepts as an order; nothing else in the design repeats these limits.
class OrderRules {
 public:
  static bool valid(int id, int price, int quantity) { return id >= 1 && validTerms(price, quantity); }
  static bool validTerms(int price, int quantity) {
    return price >= 1 && price <= book::kMaxPrice && quantity >= 1 && quantity <= book::kMaxQuantity;
  }
};
