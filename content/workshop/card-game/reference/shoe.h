#pragma once
#include <cstddef>
#include <utility>

#include "api_storm2.h"

// The cards still to be drawn, top first. The caller chose the order; the shoe only hands the cards out.
class Shoe {
 public:
  explicit Shoe(cards::Deck deck) : deck_(std::move(deck)) {}

  bool empty() const { return next_ >= deck_.size(); }
  // Precondition: !empty().
  cards::Card draw() { return deck_[next_++]; }

 private:
  cards::Deck deck_;
  std::size_t next_ = 0;
};
