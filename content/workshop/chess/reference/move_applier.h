#pragma once
#include "rule_book.h"

// Makes a move on a position: the one place where a move changes anything.
class MoveApplier {
 public:
  explicit MoveApplier(const RuleBook& rules) : rules_(rules) {}

  void apply(Position& position, const Move& move) const {
    const chess::Piece mover = position.board.at(move.from);
    position.board.clear(move.from);
    position.board.place(move.to, promotes(move) ? chess::Piece{mover.color, move.promoteTo} : mover);
    for (const auto& special : rules_.specials()) special->afterMove(position, move);
    position.turn = opposite(position.turn);
  }

 private:
  const RuleBook& rules_;
};
