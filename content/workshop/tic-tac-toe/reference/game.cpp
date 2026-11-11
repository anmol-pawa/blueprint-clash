#include "game_impl.h"

std::unique_ptr<ttt::Game> ttt::makeGame() { return std::make_unique<GameImpl>(GameConfig()); }

std::unique_ptr<ttt::ConfigurableGame> ttt::makeConfigurableGame(int rows, int cols, int winLength) {
  const GameConfig config(rows, cols, winLength);
  if (!config.valid()) return nullptr;
  return std::make_unique<GameImpl>(config);
}

std::unique_ptr<ttt::UndoableGame> ttt::makeUndoableGame(int rows, int cols, int winLength) {
  const GameConfig config(rows, cols, winLength);
  if (!config.valid()) return nullptr;
  return std::make_unique<GameImpl>(config);
}
