#pragma once
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "round_game.h"

constexpr std::size_t kBlackjackOpening = 2;
constexpr std::size_t kCharlieCards = 5;
constexpr int kDealerStandsOn = 17;

// Twenty-One: two cards each, players decide, the dealer draws to 17. House rules are data, not subclasses.
class Blackjack : public RoundGame {
 public:
  Blackjack(const std::vector<std::string>& names, cards::Deck deck, const cards::HouseRules& rules)
      : RoundGame(names, std::move(deck), std::make_unique<BlackjackScorer>()), rules_(rules) {}

 protected:
  std::size_t openingCards() const override { return kBlackjackOpening; }

  bool canAct(const Hand& hand) const override {
    if (rules_.fiveCardCharlie && hand.size() >= kCharlieCards) return false;
    return scoreOf(hand).total < kBlackjackTarget;
  }

  bool dealerDraws(const Hand& hand) const override {
    const Score score = scoreOf(hand);
    if (score.total < kDealerStandsOn) return true;
    return rules_.dealerHitsSoft17 && score.total == kDealerStandsOn && score.soft;
  }

  cards::Result settle(const Hand& player, const Hand& dealer) const override {
    const int mine = scoreOf(player).total;
    const int theirs = scoreOf(dealer).total;
    const bool dealerNatural = isNatural(dealer);
    if (mine > kBlackjackTarget) return cards::Result::Lose;
    if (isCharlie(player)) return dealerNatural ? cards::Result::Lose : cards::Result::Win;
    if (theirs > kBlackjackTarget) return cards::Result::Win;
    if (isNatural(player)) return dealerNatural ? cards::Result::Push : cards::Result::Win;
    if (dealerNatural) return cards::Result::Lose;
    if (mine == theirs) return cards::Result::Push;
    return mine > theirs ? cards::Result::Win : cards::Result::Lose;
  }

 private:
  bool isNatural(const Hand& hand) const {
    return hand.size() == kBlackjackOpening && scoreOf(hand).total == kBlackjackTarget;
  }
  bool isCharlie(const Hand& hand) const {
    return rules_.fiveCardCharlie && hand.size() >= kCharlieCards && scoreOf(hand).total <= kBlackjackTarget;
  }

  cards::HouseRules rules_;
};
