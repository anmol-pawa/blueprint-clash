#pragma once
#include <algorithm>
#include <vector>

#include "registry.h"

// The two sides of the book and the one rule that moves orders between them: price-time priority.
class Sides {
 public:
  Sides() : bids_(book::Side::Buy), asks_(book::Side::Sell) {}

  HalfBook& own(book::Side side) { return side == book::Side::Buy ? bids_ : asks_; }
  const HalfBook& own(book::Side side) const { return side == book::Side::Buy ? bids_ : asks_; }
  HalfBook& other(book::Side side) { return own(side == book::Side::Buy ? book::Side::Sell : book::Side::Buy); }
  const HalfBook& other(book::Side side) const {
    return own(side == book::Side::Buy ? book::Side::Sell : book::Side::Buy);
  }

 private:
  HalfBook bids_;
  HalfBook asks_;
};

class Matcher {
 public:
  Matcher(Sides& sides, RestingIndex& index) : sides_(sides), index_(index) {}

  // Trades `taker` against the opposite side while the best price is acceptable, oldest order first, at the maker's price.
  void match(Order& taker, std::vector<book::Fill>& fills) {
    HalfBook& opposite = sides_.other(taker.side());
    while (!taker.done() && opposite.crossedBy(taker.price())) {
      Order& maker = opposite.oldestAtBest();
      const int traded = std::min(taker.remaining(), maker.remaining());
      fills.push_back(book::Fill{taker.id(), maker.id(), maker.price(), traded});
      taker.fill(traded);
      maker.fill(traded);
      if (maker.done()) retire(opposite, maker);
    }
  }

  // What an order like this could trade right now. Pure: nothing moves.
  int available(const Order& taker) const { return sides_.other(taker.side()).availableFor(taker.price()); }

 private:
  void retire(HalfBook& side, const Order& maker) {
    const RestingIndex::Handle* handle = index_.find(maker.id());
    const int id = maker.id();
    side.remove(handle->price, handle->position);
    index_.forget(id);
  }

  Sides& sides_;
  RestingIndex& index_;
};
