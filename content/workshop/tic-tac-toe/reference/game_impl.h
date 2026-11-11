#pragma once
#include "api_storm2.h"
#include "board.h"
#include "game_config.h"
#include "line_rule.h"
#include "move_history.h"
#include "players.h"

// The public face. Each play() validates first and mutates last, and delegates every question
// about the grid, the line rule, the turn and the history to the object that owns it.
class GameImpl : public ttt::UndoableGame {
 public:
  explicit GameImpl(const GameConfig& config) : config_(config), board_(config.rows(), config.cols()), rule_(config.winLength()) {}

  ttt::Status play(int row, int col) override {
    if (outcome_ != ttt::Outcome::InProgress) return ttt::Status::GameOver;
    if (!board_.inBounds(row, col)) return ttt::Status::OutOfBounds;
    if (!board_.isEmpty(row, col)) return ttt::Status::CellTaken;

    const char mark = players_.current();
    board_.place(row, col, mark);
    history_.record(row, col);
    if (rule_.completedBy(board_, row, col)) {
      outcome_ = ttt::Outcome::Won;
      winner_ = mark;
    } else if (board_.full()) {
      outcome_ = ttt::Outcome::Draw;
    }
    players_.advance();
    return ttt::Status::Ok;
  }

  char nextPlayer() const override { return outcome_ == ttt::Outcome::InProgress ? players_.current() : '\0'; }
  ttt::Outcome outcome() const override { return outcome_; }
  char winner() const override { return winner_; }
  char cellAt(int row, int col) const override { return board_.inBounds(row, col) ? board_.at(row, col) : '\0'; }
  int movesPlayed() const override { return history_.size(); }

  int rows() const override { return config_.rows(); }
  int cols() const override { return config_.cols(); }
  int winLength() const override { return config_.winLength(); }

  // The game ends on the first win or draw, so the last move is always the one that ended it:
  // taking it back always reopens the game.
  bool undo() override {
    if (history_.empty()) return false;
    const MoveHistory::Move last = history_.popLast();
    board_.clear(last.first, last.second);
    players_.rewind();
    outcome_ = ttt::Outcome::InProgress;
    winner_ = '\0';
    return true;
  }

 private:
  GameConfig config_;
  Board board_;
  LineWinRule rule_;
  Players players_;
  MoveHistory history_;
  ttt::Outcome outcome_ = ttt::Outcome::InProgress;
  char winner_ = '\0';
};
