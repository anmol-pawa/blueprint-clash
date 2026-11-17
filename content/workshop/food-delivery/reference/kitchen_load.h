#pragma once
#include <climits>
#include <map>
#include <string>

#include "order_book.h"

// How many orders each kitchen is cooking right now, and whether it has a place free. It learns about the load by
// listening to the order book (Observer), so no lifecycle code has to remember to adjust it.
class KitchenLoad {
 public:
  static constexpr int kUnlimited = INT_MAX;

  KitchenLoad(const OrderBook& book, int slots) : book_(book), slots_(slots) {}

  bool hasRoom(const std::string& restaurant) const {
    const auto found = cooking_.find(restaurant);
    return found == cooking_.end() || found->second < slots_;
  }

  void observe(food::OrderId id, food::OrderState from, food::OrderState to) {
    const std::string& restaurant = book_.find(id)->restaurant;
    if (to == food::OrderState::Accepted) ++cooking_[restaurant];
    if (from == food::OrderState::Accepted) --cooking_[restaurant];
  }

 private:
  const OrderBook& book_;
  int slots_;
  std::map<std::string, int> cooking_;
};
