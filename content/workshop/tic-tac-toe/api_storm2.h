#pragma once
// Change Storm 2 adds undo. Everything from api.h and api_storm1.h still holds.
// Only games made by makeUndoableGame() have the new operation.
#include "api_storm1.h"

namespace ttt {

class UndoableGame : public ConfigurableGame {
 public:
  // Takes back the most recent successful play(). Returns false (and changes nothing) if there is none.
  virtual bool undo() = 0;
};

// Same validation as makeConfigurableGame().
std::unique_ptr<UndoableGame> makeUndoableGame(int rows, int cols, int winLength);

}  // namespace ttt
