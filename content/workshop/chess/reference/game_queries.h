#pragma once
#include <algorithm>
#include <string>
#include <vector>

#include "check_detector.h"
#include "move_generator.h"

// The state of one game and everything that can be asked about it without changing it.
class GameQueries : public chess::UndoGame {
 public:
  GameQueries(Rules rules, Position start)
      : rules_(rules), detector_(rules_.pieces()), applier_(rules_), generator_(rules_, detector_, applier_), position_(std::move(start)) {
    refresh();
  }

  chess::Status pieceAt(const std::string& square, chess::Piece& out) const override {
    const Square at = Square::parse(square);
    if (!at.valid()) return chess::Status::InvalidSquare;
    if (!position_.board.occupied(at)) return chess::Status::Empty;
    out = position_.board.at(at);
    return chess::Status::Ok;
  }

  chess::Color turn() const override { return position_.turn; }
  bool inCheck() const override { return detector_.inCheck(position_.board, position_.turn); }
  chess::Outcome outcome() const override { return outcome_; }

  std::vector<std::string> legalMoves(const std::string& from) const override {
    std::vector<Move> moves;
    const Square at = Square::parse(from);
    if (at.valid()) generator_.legalFrom(position_, at, moves);
    std::vector<std::string> names;
    for (const Move& move : moves) names.push_back(move.to.name());
    std::sort(names.begin(), names.end());
    names.erase(std::unique(names.begin(), names.end()), names.end());
    return names;
  }

 protected:
  // Works out whether the game is over; call after every change of the position.
  void refresh() {
    if (generator_.anyLegal(position_)) outcome_ = chess::Outcome::Ongoing;
    else outcome_ = inCheck() ? chess::Outcome::Checkmate : chess::Outcome::Stalemate;
  }

  RuleBook rules_;
  CheckDetector detector_;
  MoveApplier applier_;
  MoveGenerator generator_;
  Position position_;
  chess::Outcome outcome_ = chess::Outcome::Ongoing;
};
