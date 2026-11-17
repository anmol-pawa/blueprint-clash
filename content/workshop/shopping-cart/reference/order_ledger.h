#pragma once
#include <map>
#include <string>

#include "basket.h"

// What was bought, by whom and for how much. Plain data.
struct Order {
  std::string customer;
  Lines lines;
  cart::Money total = 0;
};

// Issues order ids and spends them on cancel. Ids are positive and never reused.
class OrderLedger {
 public:
  cart::OrderId record(Order order) {
    orders_.emplace(++lastId_, std::move(order));
    return lastId_;
  }

  const Order* find(cart::OrderId id) const {
    const auto it = orders_.find(id);
    return it == orders_.end() ? nullptr : &it->second;
  }

  void spend(cart::OrderId id) { orders_.erase(id); }

 private:
  cart::OrderId lastId_ = cart::kNoOrder;
  std::map<cart::OrderId, Order> orders_;
};
