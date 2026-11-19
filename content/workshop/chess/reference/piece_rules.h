#pragma once
#include <array>
#include <memory>
#include <utility>
#include <vector>

#include "board.h"
#include "colors.h"
#include "move.h"

// How one kind of piece moves (Strategy). A rule is stateless: it looks at the board and the square it is asked about.
class PieceRules {
 public:
  virtual ~PieceRules() = default;
  // The squares this piece attacks: where it could capture. The first piece on a line counts, whichever colour it is.
  virtual void attacks(const Board& board, Square from, chess::Color color, std::vector<Square>& out) const = 0;
  // The moves the piece may make by its own movement rules alone (its king's safety is somebody else's question).
  virtual void moves(const Board& board, Square from, chess::Color color, std::vector<Move>& out) const = 0;
};

// A piece that may move to every square it attacks except those held by a friend: knight, bishop, rook, queen, king.
class ReachRule : public PieceRules {
 public:
  void moves(const Board& board, Square from, chess::Color color, std::vector<Move>& out) const override {
    std::vector<Square> reach;
    attacks(board, from, color, reach);
    for (const Square& to : reach) {
      if (!board.occupied(to) || board.at(to).color != color) out.push_back(Move{from, to});
    }
  }
};

using Steps = std::vector<std::pair<int, int>>;

// Jumps by a fixed list of offsets: knight and king.
class StepRule : public ReachRule {
 public:
  explicit StepRule(Steps steps) : steps_(std::move(steps)) {}

  void attacks(const Board&, Square from, chess::Color, std::vector<Square>& out) const override {
    for (const auto& step : steps_) {
      const Square to = from.offset(step.first, step.second);
      if (to.valid()) out.push_back(to);
    }
  }

 private:
  Steps steps_;
};

// Slides along its directions until the first piece: bishop, rook, queen.
class SlideRule : public ReachRule {
 public:
  explicit SlideRule(Steps directions) : directions_(std::move(directions)) {}

  void attacks(const Board& board, Square from, chess::Color, std::vector<Square>& out) const override {
    for (const auto& direction : directions_) {
      Square to = from.offset(direction.first, direction.second);
      while (to.valid()) {
        out.push_back(to);
        if (board.occupied(to)) break;
        to = to.offset(direction.first, direction.second);
      }
    }
  }

 private:
  Steps directions_;
};

class PawnRule : public PieceRules {
 public:
  void attacks(const Board&, Square from, chess::Color color, std::vector<Square>& out) const override {
    for (const int fileStep : {-1, 1}) {
      const Square to = from.offset(fileStep, forwardStep(color));
      if (to.valid()) out.push_back(to);
    }
  }

  void moves(const Board& board, Square from, chess::Color color, std::vector<Move>& out) const override {
    const Square one = from.offset(0, forwardStep(color));
    if (one.valid() && !board.occupied(one)) {
      add(from, one, color, MoveKind::Normal, out);
      const Square two = from.offset(0, 2 * forwardStep(color));
      if (from.rank() == pawnRank(color) && !board.occupied(two)) out.push_back(Move{from, two, chess::Kind::Pawn, MoveKind::DoublePush});
    }
    std::vector<Square> diagonals;
    attacks(board, from, color, diagonals);
    for (const Square& to : diagonals) {
      if (board.occupied(to) && board.at(to).color != color) add(from, to, color, MoveKind::Normal, out);
    }
  }

 private:
  // A move onto the last rank is four moves: one per piece the pawn may become.
  static void add(Square from, Square to, chess::Color color, MoveKind kind, std::vector<Move>& out) {
    if (to.rank() != lastRank(color)) {
      out.push_back(Move{from, to, chess::Kind::Pawn, kind});
      return;
    }
    for (const chess::Kind becomes : {chess::Kind::Queen, chess::Kind::Rook, chess::Kind::Bishop, chess::Kind::Knight}) {
      out.push_back(Move{from, to, becomes, kind});
    }
  }
};

// The rules of every kind of piece, found by kind: no switch, so a new piece is a new entry.
class RuleTable {
 public:
  RuleTable() {
    const Steps straight{{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    const Steps diagonal{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
    Steps around = straight;
    around.insert(around.end(), diagonal.begin(), diagonal.end());
    const Steps jumps{{1, 2}, {2, 1}, {2, -1}, {1, -2}, {-1, -2}, {-2, -1}, {-2, 1}, {-1, 2}};
    set(chess::Kind::Pawn, std::make_unique<PawnRule>());
    set(chess::Kind::Knight, std::make_unique<StepRule>(jumps));
    set(chess::Kind::Bishop, std::make_unique<SlideRule>(diagonal));
    set(chess::Kind::Rook, std::make_unique<SlideRule>(straight));
    set(chess::Kind::Queen, std::make_unique<SlideRule>(around));
    set(chess::Kind::King, std::make_unique<StepRule>(around));
  }

  const PieceRules& of(chess::Kind kind) const { return *rules_[static_cast<std::size_t>(kind)]; }

 private:
  void set(chess::Kind kind, std::unique_ptr<PieceRules> rule) { rules_[static_cast<std::size_t>(kind)] = std::move(rule); }

  std::array<std::unique_ptr<PieceRules>, 6> rules_;
};
