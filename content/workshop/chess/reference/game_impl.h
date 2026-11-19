#pragma once
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "game_queries.h"
#include "position_parser.h"

// The commands. A move is looked up among the legal moves of the piece, so there is one definition of "legal"; the
// history is a stack of whole positions (Memento), which is why undo needs to know nothing about the rules.
class GameImpl : public GameQueries {
 public:
  using GameQueries::GameQueries;

  static std::unique_ptr<GameImpl> create(Rules rules, const std::vector<std::string>& rows, chess::Color toMove) {
    const RuleTable pieces;
    const CheckDetector detector(pieces);
    Position start;
    if (!PositionParser(detector).parse(rows, toMove, start)) return nullptr;
    return std::make_unique<GameImpl>(rules, start);
  }

  chess::Status move(const std::string& from, const std::string& to, chess::Kind promoteTo) override {
    if (outcome_ != chess::Outcome::Ongoing) return chess::Status::GameOver;
    const Square source = Square::parse(from);
    const Square target = Square::parse(to);
    if (!source.valid() || !target.valid()) return chess::Status::InvalidSquare;
    if (!position_.board.occupied(source)) return chess::Status::Empty;
    if (position_.board.at(source).color != position_.turn) return chess::Status::NotYourTurn;
    std::vector<Move> options;
    generator_.legalFrom(position_, source, options);
    options.erase(std::remove_if(options.begin(), options.end(), [&](const Move& m) { return m.to != target; }), options.end());
    if (options.empty()) return chess::Status::IllegalMove;
    const Move* chosen = choose(options, promoteTo);
    if (!chosen) return chess::Status::InvalidPromotion;
    history_.push_back(position_);
    applier_.apply(position_, *chosen);
    refresh();
    return chess::Status::Ok;
  }

  chess::Status undo() override {
    if (history_.empty()) return chess::Status::NothingToUndo;
    position_ = history_.back();
    history_.pop_back();
    refresh();
    return chess::Status::Ok;
  }

  std::size_t moveCount() const override { return history_.size(); }

 private:
  // One option, or four when the move is a promotion (one per piece): the one asked for, or nothing.
  static const Move* choose(const std::vector<Move>& options, chess::Kind promoteTo) {
    if (!promotes(options.front())) return &options.front();
    for (const Move& option : options) {
      if (option.promoteTo == promoteTo) return &option;
    }
    return nullptr;
  }

  std::vector<Position> history_;
};
