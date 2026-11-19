#include "blackjack.h"
#include "setup.h"
#include "showdown.h"

std::unique_ptr<cards::Game> cards::makeBlackjackWith(const std::vector<std::string>& players, const Deck& deck,
                                                       const HouseRules& rules) {
  if (!TableValidator::valid(players, deck, kBlackjackOpening)) return nullptr;
  return std::make_unique<Blackjack>(players, deck, rules);
}

std::unique_ptr<cards::Game> cards::makeBlackjack(const std::vector<std::string>& players, const Deck& deck) {
  return makeBlackjackWith(players, deck, HouseRules{});
}

std::unique_ptr<cards::Game> cards::makeShowdown(const std::vector<std::string>& players, const Deck& deck) {
  if (!TableValidator::valid(players, deck, kShowdownOpening)) return nullptr;
  return std::make_unique<Showdown>(players, deck);
}
