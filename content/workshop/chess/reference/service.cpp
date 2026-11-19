#include "game_impl.h"

std::unique_ptr<chess::Game> chess::makeGame() { return GameImpl::create(Rules::Basic, PositionParser::startRows(), chess::Color::White); }

std::unique_ptr<chess::Game> chess::makeGameFrom(const std::vector<std::string>& rows, chess::Color toMove) {
  return GameImpl::create(Rules::Basic, rows, toMove);
}

std::unique_ptr<chess::Game> chess::makeFullGame() { return GameImpl::create(Rules::Full, PositionParser::startRows(), chess::Color::White); }

std::unique_ptr<chess::Game> chess::makeFullGameFrom(const std::vector<std::string>& rows, chess::Color toMove) {
  return GameImpl::create(Rules::Full, rows, toMove);
}

std::unique_ptr<chess::UndoGame> chess::makeUndoGame() { return GameImpl::create(Rules::Full, PositionParser::startRows(), chess::Color::White); }

std::unique_ptr<chess::UndoGame> chess::makeUndoGameFrom(const std::vector<std::string>& rows, chess::Color toMove) {
  return GameImpl::create(Rules::Full, rows, toMove);
}
