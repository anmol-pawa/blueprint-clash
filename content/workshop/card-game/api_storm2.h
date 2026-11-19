#pragma once
// Change Storm 2: a second game on the same table.
#include "api_storm1.h"

namespace cards {

// Showdown is played with the same Game interface and the same deal, but it has no decisions and a different score.
//
// SETUP. makeShowdown(players, deck) has the setup rules of makeBlackjack, except that the deck must hold 3 * (players + 1)
// cards.
//
// DEAL. deal() gives every seat THREE cards, one at a time round the table in seat order and ending with the dealer, in
// three rounds. The dealer takes no more cards and no player decides anything: right after deal() the phase is Finished,
// current() is "", and hit() and stand() answer WrongPhase (after the UnknownPlayer check).
//
// VALUE. total() and dealerTotal() are the sum of the card points, modulo 10, where an Ace is 1, 2..9 are their rank and 10,
// Jack, Queen and King are 0. The result of a player is Win for a higher value than the dealer, Lose for a lower one and
// Push for the same.
std::unique_ptr<Game> makeShowdown(const std::vector<std::string>& players, const Deck& deck);

}  // namespace cards
