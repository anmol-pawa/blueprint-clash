#pragma once
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "round_game.h"

constexpr std::size_t kShowdownOpening = 3;

// Three cards each, nobody decides, the higher value (modulo ten) wins. Only the four hooks differ from Blackjack.
class Showdown : public RoundGame {
 public:
  Showdown(const std::vector<std::string>& names, cards::Deck deck)
      : RoundGame(names, std::move(deck), std::make_unique<ModTenScorer>()) {}

 protected:
  std::size_t openingCards() const override { return kShowdownOpening; }
  bool canAct(const Hand&) const override { return false; }
  bool dealerDraws(const Hand&) const override { return false; }

  cards::Result settle(const Hand& player, const Hand& dealer) const override {
    const int mine = scoreOf(player).total;
    const int theirs = scoreOf(dealer).total;
    if (mine == theirs) return cards::Result::Push;
    return mine > theirs ? cards::Result::Win : cards::Result::Lose;
  }
};
