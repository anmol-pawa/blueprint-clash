#pragma once
// Public API for the Card Game Framework problem. The hidden tests only use what is declared here.
// You implement cards::makeBlackjack() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>
#include <vector>

namespace cards {

enum class Suit { Clubs, Diamonds, Hearts, Spades };

// rank 1 is an Ace, 2..10 are the numbers, 11 is a Jack, 12 a Queen and 13 a King.
struct Card {
  int rank;
  Suit suit;
};
inline bool operator==(const Card& a, const Card& b) { return a.rank == b.rank && a.suit == b.suit; }

constexpr int kAce = 1;
constexpr int kJack = 11;
constexpr int kQueen = 12;
constexpr int kKing = 13;

// A deck is a list of cards; the card at the FRONT is the top and is drawn first. The caller decides the order (a stacked
// deck keeps every game testable; shuffling is the caller's job), and a deck may hold repeats (a shoe of several packs).
using Deck = std::vector<Card>;

// 52 cards: Clubs, then Diamonds, then Hearts, then Spades, each Ace to King.
inline Deck standardDeck() {
  Deck deck;
  for (int suit = 0; suit < 4; ++suit) {
    for (int rank = kAce; rank <= kKing; ++rank) deck.push_back(Card{rank, static_cast<Suit>(suit)});
  }
  return deck;
}

enum class Status {
  Ok,
  UnknownPlayer,  // no seat has that name
  WrongPhase,     // the call does not fit the state of the round (see Phase)
  NotYourTurn,    // it is another player's turn
  DeckEmpty,      // hit() with no card left to draw
};

enum class Phase {
  Waiting,      // created, nothing dealt yet
  PlayerTurns,  // dealt; the players decide one after another
  Finished,     // the dealer has played and every result is known
};

enum class Result { Win, Lose, Push };  // for a player, against the dealer

// One round of Twenty-One (Blackjack) for 1 to 6 players against the dealer, played from a stacked deck.
//
// SETUP. makeBlackjack(players, deck) returns nullptr unless there are 1 to 6 player names, each 1 to 16 characters and
// all different, and the deck holds at least 2 * (players + 1) cards (enough for the first deal). Seats are in the order
// of the names; the dealer is not a player and has no name. The game starts in Phase::Waiting.
//
// DEAL. deal() is allowed once, in Waiting (WrongPhase otherwise). Cards are dealt one at a time from the top of the deck,
// going round the table in seat order and ending with the dealer, and then round again: every seat, then the dealer, gets
// two cards. All cards are face up. Then the phase is PlayerTurns.
//
// VALUES. A number card is worth its rank, a Jack, Queen or King is worth 10, an Ace is worth 1 or 11, whichever gives
// the higher total that is not above 21. total() is that best total; when every choice is above 21 it is the sum with
// each Ace as 1 (a bust). A natural is a two-card hand worth 21.
//
// TURNS. The players act in seat order; current() is the name of the player to act, or "" outside PlayerTurns. A player
// whose hand is worth 21 or more (a natural, or after a hit) has no decision: the turn passes at once. hit() draws the
// top card into the hand; stand() ends the turn. When the last turn is over the dealer plays at once. CHECK ORDER for hit()
// and stand(): UnknownPlayer, WrongPhase (not PlayerTurns), NotYourTurn, and for hit() also DeckEmpty (the turn stays).
// A refused call changes nothing.
//
// DEALER. The dealer takes cards while the hand is worth less than 17 and stands on every 17 or more, soft or hard. If the
// deck runs out the dealer stands. Then the phase is Finished.
//
// RESULT. result(player) is WrongPhase until Finished. Then, in this order: a bust loses (even if the dealer busts too); a
// dealer bust wins; a natural against a natural is a Push, a natural against anything else wins, anything else against a
// dealer natural loses; otherwise the higher total wins and equal totals push.
class Game {
 public:
  virtual ~Game() = default;

  virtual Status deal() = 0;
  virtual Status hit(const std::string& player) = 0;
  virtual Status stand(const std::string& player) = 0;

  virtual Phase phase() const = 0;
  virtual std::string current() const = 0;

  // Queries. The out-parameter is touched only on Ok; UnknownPlayer for a name that is not seated. Before the deal a hand is
  // empty and its total is 0.
  virtual Status hand(const std::string& player, std::vector<Card>& out) const = 0;  // in the order dealt
  virtual Status total(const std::string& player, int& out) const = 0;
  virtual Status result(const std::string& player, Result& out) const = 0;

  virtual std::vector<Card> dealerHand() const = 0;
  virtual int dealerTotal() const = 0;
};

std::unique_ptr<Game> makeBlackjack(const std::vector<std::string>& players, const Deck& deck);

}  // namespace cards
