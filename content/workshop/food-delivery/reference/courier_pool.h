#pragma once
#include <map>
#include <set>
#include <string>

#include "order_book.h"

// Couriers and the queue of ready orders that have none. Free couriers are found by lowest name; waiting orders go
// out oldest first. It records an assignment on the order, but never changes an order's state.
class CourierPool {
 public:
  explicit CourierPool(OrderBook& book) : book_(book) {}

  bool enroll(const std::string& courier) {
    if (courier.empty() || !holding_.emplace(courier, food::kNoOrder).second) return false;
    handOver(courier);
    return true;
  }

  void orderReady(food::OrderId id) {
    for (auto& [name, held] : holding_) {
      if (held != food::kNoOrder) continue;
      held = id;
      book_.assign(id, name);
      return;
    }
    waiting_.insert(id);
  }

  void orderDelivered(food::OrderId id) { handOver(book_.find(id)->courier); }

  void orderCancelled(food::OrderId id) {
    const std::string& courier = book_.find(id)->courier;
    if (courier.empty()) {
      waiting_.erase(id);
    } else {
      handOver(courier);
    }
  }

 private:
  // The courier is free; give them the oldest waiting order, if there is one.
  void handOver(const std::string& courier) {
    holding_[courier] = food::kNoOrder;
    if (waiting_.empty()) return;
    const food::OrderId next = *waiting_.begin();
    waiting_.erase(waiting_.begin());
    holding_[courier] = next;
    book_.assign(next, courier);
  }

  OrderBook& book_;
  std::map<std::string, food::OrderId> holding_;
  std::set<food::OrderId> waiting_;
};
