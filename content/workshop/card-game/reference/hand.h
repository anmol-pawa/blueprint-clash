#pragma once
#include <cstddef>
#include <vector>

#include "api_storm2.h"

// The cards one seat holds, in the order they were dealt.
class Hand {
 public:
  void add(const cards::Card& card) { cards_.push_back(card); }
  const std::vector<cards::Card>& cards() const { return cards_; }
  std::size_t size() const { return cards_.size(); }

 private:
  std::vector<cards::Card> cards_;
};
