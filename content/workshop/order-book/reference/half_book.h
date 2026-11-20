#pragma once
#include <list>
#include <map>

#include "order.h"

// Which way "better" points on one side, and how a price becomes a map key so that the best price sorts first: sells by
// price, buys by its negation.
class PriceOrder {
 public:
  explicit PriceOrder(book::Side side) : side_(side) {}

  int keyOf(int price) const { return side_ == book::Side::Sell ? price : -price; }
  int priceOf(int key) const { return side_ == book::Side::Sell ? key : -key; }
  // Would an incoming order with this limit trade at `price` on this side?
  bool acceptable(int price, int limit) const { return side_ == book::Side::Sell ? price <= limit : price >= limit; }

 private:
  book::Side side_;
};

// All the resting orders of ONE side, grouped by price, each price a queue in arrival order. The map key is arranged so that
// the BEST price is always first: sells by price, buys by negated price. Nothing here knows how orders trade.
class HalfBook {
 public:
  using Queue = std::list<Order>;
  using Position = Queue::iterator;

  explicit HalfBook(book::Side side) : order_(side) {}

  bool empty() const { return levels_.empty(); }
  int bestPrice() const { return order_.priceOf(levels_.begin()->first); }
  Order& oldestAtBest() { return levels_.begin()->second.front(); }

  // True when an incoming order with this limit would trade with the best price here.
  bool crossedBy(int limit) const {
    return !empty() && order_.acceptable(bestPrice(), limit);
  }

  Position add(const Order& order) {
    Queue& queue = levels_[order_.keyOf(order.price())];
    queue.push_back(order);
    return std::prev(queue.end());
  }

  void remove(int price, Position position) {
    const auto level = levels_.find(order_.keyOf(price));
    level->second.erase(position);
    if (level->second.empty()) levels_.erase(level);
  }

  int depthAt(int price) const {
    const auto level = levels_.find(order_.keyOf(price));
    return level == levels_.end() ? 0 : total(level->second);
  }

  bool best(int& price, int& quantity) const {
    if (empty()) return false;
    price = bestPrice();
    quantity = total(levels_.begin()->second);
    return true;
  }

  // Quantity an incoming order with this limit could trade with, best price first, without changing anything.
  int availableFor(int limit) const {
    int sum = 0;
    for (const auto& [key, queue] : levels_) {
      if (!order_.acceptable(order_.priceOf(key), limit)) break;
      sum += total(queue);
    }
    return sum;
  }

 private:
  static int total(const Queue& queue) {
    int sum = 0;
    for (const Order& order : queue) sum += order.remaining();
    return sum;
  }

  PriceOrder order_;
  std::map<int, Queue> levels_;
};
