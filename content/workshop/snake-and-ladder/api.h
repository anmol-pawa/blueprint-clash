#pragma once
// Public API for the Snake and Ladder problem. The hidden tests only use what is declared here.
// You implement snl::makeGame() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <vector>

namespace snl {

// A source of dice rolls. The game never creates its own randomness: tests hand it a scripted dice.
// Every roll() returns a number from 1 to 6.
class Dice {
 public:
  virtual ~Dice() = default;
  virtual int roll() = 0;
};

// A snake or a ladder: a piece that stops on square `from` is moved to square `to`.
// It is a ladder when to > from and a snake when to < from.
struct Link {
  int from;
  int to;
};

enum class Jump {
  None,
  Ladder,
  Snake
};

// What happened in one call to takeTurn().
struct Turn {
  int player = -1;       // who rolled; -1 if the game was already over and nothing happened
  int roll = 0;          // the number rolled; 0 if the game was already over
  int from = 0;          // the square the player stood on before the roll
  int to = 0;            // the square the player stands on afterwards
  Jump jump = Jump::None;  // the snake or ladder that moved the player after the roll, if any
  bool won = false;      // true if this turn ended the game in the player's favour
};

class Game {
 public:
  virtual ~Game() = default;

  // The current player rolls the dice and moves. Returns what happened.
  // Once the game is over this does nothing (the dice is not rolled) and returns a Turn with player == -1.
  virtual Turn takeTurn() = 0;

  // Index of the player to roll next (players are numbered from 0); -1 once the game is over.
  virtual int currentPlayer() const = 0;
  // Square of a player: 0 before entering the board, then 1..boardSize. -1 if there is no such player.
  virtual int positionOf(int player) const = 0;
  virtual bool finished() const = 0;
  // The winner's index; -1 while the game is going.
  virtual int winner() const = 0;
  // Number of takeTurn() calls that rolled the dice.
  virtual int turnsTaken() const = 0;
};

// A board of squares 1..boardSize. Everyone starts at square 0 (off the board), player 0 rolls first and
// the turn passes round in index order. Roll the dice, move forward that many squares. The first player to
// land exactly on boardSize wins. A roll that would go past boardSize is not played: the player stays put.
// A player who stops on the start of a snake or a ladder is moved to its end. Players share squares freely.
//
// Returns nullptr unless: players >= 2, boardSize >= 2, dice is not null, and the links are sane:
// every `from` and `to` is on the board (1..boardSize), from != to, no two links share a `from`, no link
// starts on boardSize, and no link ends on the start of another link (so one stop causes at most one jump).
// A link may end on boardSize: landing there wins.
std::unique_ptr<Game> makeGame(int players, int boardSize, std::vector<Link> links, std::unique_ptr<Dice> dice);

}  // namespace snl
