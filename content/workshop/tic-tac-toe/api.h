#pragma once
// Public API for the Tic-tac-toe problem. The hidden tests only use what is declared here.
// You implement ttt::makeGame() (in any of your .cpp files); everything behind it is your design.
#include <memory>

namespace ttt {

enum class Status {
  Ok,
  OutOfBounds,
  CellTaken,
  GameOver
};

enum class Outcome {
  InProgress,
  Won,
  Draw
};

class Game {
 public:
  virtual ~Game() = default;

  // The player to move marks the cell at (row, col). Rows and columns start at 0.
  virtual Status play(int row, int col) = 0;

  // 'X' or 'O'; '\0' once the game is over.
  virtual char nextPlayer() const = 0;
  virtual Outcome outcome() const = 0;
  // The winning mark; '\0' unless outcome() == Outcome::Won.
  virtual char winner() const = 0;
  // 'X', 'O' or '.' for an empty cell; '\0' if (row, col) is off the board.
  virtual char cellAt(int row, int col) const = 0;
  // Number of successful play() calls so far.
  virtual int movesPlayed() const = 0;
};

// A classic 3x3 game, three in a row to win, X moves first.
std::unique_ptr<Game> makeGame();

}  // namespace ttt
