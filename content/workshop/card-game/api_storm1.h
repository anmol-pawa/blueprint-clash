#pragma once
// Change Storm 1: house rules.
#include "api.h"

namespace cards {

// The house wants to switch two rules on and off without changing the rest of the game. makeBlackjackWith(players, deck,
// HouseRules{}) is exactly makeBlackjack(players, deck).
struct HouseRules {
  // The dealer also draws on a SOFT 17 (a total of 17 that counts an Ace as 11). Every other total of 17 or more still stands.
  bool dealerHitsSoft17 = false;
  // A player whose hand has five cards and is worth 21 or less (not a bust) is "five-card Charlie": the turn ends at once
  // when the fifth card is dealt, whatever the total, and the hand beats every dealer hand, including a dealer's non-natural
  // 21 and a dealer's bust, except a dealer natural, which still wins. Without the rule a player keeps deciding at five cards.
  bool fiveCardCharlie = false;
};

std::unique_ptr<Game> makeBlackjackWith(const std::vector<std::string>& players, const Deck& deck, const HouseRules& rules);

}  // namespace cards
