#pragma once
// Change Storm 1 turns the game into Connect-N: any board size, any winning line length.
// Everything from api.h still holds, and makeGame() keeps working as before.
// Only games made by makeConfigurableGame() have the new operations.
#include "api.h"

namespace ttt {

class ConfigurableGame : public Game {
 public:
  virtual int rows() const = 0;
  virtual int cols() const = 0;
  virtual int winLength() const = 0;
};

// Returns nullptr if rows, cols or winLength is below 1, or if winLength is larger than both rows and cols
// (no line could ever fit).
std::unique_ptr<ConfigurableGame> makeConfigurableGame(int rows, int cols, int winLength);

}  // namespace ttt
