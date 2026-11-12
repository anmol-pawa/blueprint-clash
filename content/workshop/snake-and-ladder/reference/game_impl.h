#pragma once
#include <memory>
#include <utility>
#include <vector>

#include "api_storm2.h"
#include "board.h"
#include "overshoot.h"
#include "turn_order.h"

// The public face. takeTurn() rolls, asks the policy where the piece lands, lets the board apply any snake or
// ladder, and then asks the turn order what happens next. Each question is answered by the object that owns it.
class GameImpl : public snl::ResignableGame {
 public:
  GameImpl(int players, Board board, std::unique_ptr<OvershootPolicy> overshoot, bool sixRerolls, std::unique_ptr<snl::Dice> dice)
      : board_(std::move(board)),
        overshoot_(std::move(overshoot)),
        turns_(players, sixRerolls),
        dice_(std::move(dice)),
        positions_(static_cast<std::size_t>(players), 0) {}

  snl::Turn takeTurn() override {
    if (finished()) return snl::Turn{};
    snl::Turn turn;
    turn.player = turns_.current();
    turn.roll = dice_->roll();
    turn.from = turn.to = positions_[turn.player];
    ++turnsTaken_;
    if (!turns_.forfeits(turn.roll)) move(turn);
    if (!finished()) turns_.settle(turn.roll);
    return turn;
  }

  int currentPlayer() const override { return finished() ? -1 : turns_.current(); }
  int positionOf(int player) const override { return inRange(player) ? positions_[player] : -1; }
  bool finished() const override { return winner_ != -1; }
  int winner() const override { return winner_; }
  int turnsTaken() const override { return turnsTaken_; }

  bool resign(int player) override {
    if (finished() || !turns_.isActive(player)) return false;
    turns_.leave(player);
    if (turns_.activeCount() == 1) winner_ = turns_.firstActive();
    return true;
  }

  bool isActive(int player) const override { return turns_.isActive(player); }

 private:
  bool inRange(int player) const { return player >= 0 && player < static_cast<int>(positions_.size()); }

  void move(snl::Turn& turn) {
    const int landing = overshoot_->landing(turn.from, turn.roll, board_.size());
    turn.jump = board_.jumpAt(landing);
    turn.to = board_.endOf(landing);
    positions_[turn.player] = turn.to;
    if (turn.to == board_.size()) {
      winner_ = turn.player;
      turn.won = true;
    }
  }

  Board board_;
  std::unique_ptr<OvershootPolicy> overshoot_;
  TurnOrder turns_;
  std::unique_ptr<snl::Dice> dice_;
  std::vector<int> positions_;
  int winner_ = -1;
  int turnsTaken_ = 0;
};
