#pragma once
#include "check_detector.h"
#include "move_applier.h"

// Finds the legal moves: the piece's own moves and the special moves, minus those that leave the mover's king attacked.
class MoveGenerator {
 public:
  MoveGenerator(const RuleBook& rules, const CheckDetector& detector, const MoveApplier& applier)
      : rules_(rules), detector_(detector), applier_(applier) {}

  void legalFrom(const Position& position, Square from, std::vector<Move>& out) const {
    if (!position.board.occupied(from) || position.board.at(from).color != position.turn) return;
    std::vector<Move> candidates;
    rules_.pieces().of(position.board.at(from).kind).moves(position.board, from, position.turn, candidates);
    for (const auto& special : rules_.specials()) special->generate(position, from, candidates);
    for (const Move& move : candidates) {
      Position after = position;
      applier_.apply(after, move);
      if (!detector_.inCheck(after.board, position.turn)) out.push_back(move);
    }
  }

  bool anyLegal(const Position& position) const {
    std::vector<Move> found;
    for (const Square& from : position.board.squaresOf(position.turn)) {
      legalFrom(position, from, found);
      if (!found.empty()) return true;
    }
    return false;
  }

 private:
  const RuleBook& rules_;
  const CheckDetector& detector_;
  const MoveApplier& applier_;
};
