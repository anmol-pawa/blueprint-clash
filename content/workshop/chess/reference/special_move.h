#pragma once
#include <algorithm>
#include <vector>

#include "check_detector.h"
#include "position.h"

// A rule that is not a piece's own way of moving (Strategy): it may add moves and it may have to do more than move one piece.
class SpecialMove {
 public:
  virtual ~SpecialMove() = default;
  // Extra moves for the piece of the side to move standing on `from`.
  virtual void generate(const Position& position, Square from, std::vector<Move>& out) const = 0;
  // Called after the piece has been moved, captured and promoted: finish the move and update the state it keeps.
  virtual void afterMove(Position& position, const Move& move) const = 0;
};

class CastlingRule : public SpecialMove {
 public:
  explicit CastlingRule(const RuleTable& pieces) : detector_(pieces) {}

  void generate(const Position& position, Square from, std::vector<Move>& out) const override {
    const chess::Color side = position.turn;
    if (from != Square(kKingFile, homeRank(side))) return;
    if (detector_.attacked(position.board, from, opposite(side))) return;
    if (position.rights.kingSide[sideIndex(side)]) addIfClear(position, from, +1, kRookFileKingSide, out);
    if (position.rights.queenSide[sideIndex(side)]) addIfClear(position, from, -1, kRookFileQueenSide, out);
  }

  void afterMove(Position& position, const Move& move) const override {
    if (move.kind == MoveKind::Castle) moveRook(position, move);
    for (const chess::Color side : {chess::Color::White, chess::Color::Black}) {
      const int rank = homeRank(side);
      if (touches(move, Square(kKingFile, rank))) {
        position.rights.kingSide[sideIndex(side)] = false;
        position.rights.queenSide[sideIndex(side)] = false;
      }
      if (touches(move, Square(kRookFileKingSide, rank))) position.rights.kingSide[sideIndex(side)] = false;
      if (touches(move, Square(kRookFileQueenSide, rank))) position.rights.queenSide[sideIndex(side)] = false;
    }
  }

 private:
  static constexpr int kKingFile = 4;
  static constexpr int kRookFileKingSide = 7;
  static constexpr int kRookFileQueenSide = 0;

  static bool touches(const Move& move, Square square) { return move.from == square || move.to == square; }

  // Adds the castling towards `rookFile` when the squares between king and rook are empty and the king's way is not attacked.
  // The landing square is checked like for any king move, by the legality filter.
  void addIfClear(const Position& position, Square king, int direction, int rookFile, std::vector<Move>& out) const {
    for (int file = kKingFile + direction; file != rookFile; file += direction) {
      if (position.board.occupied(Square(file, king.rank()))) return;
    }
    if (detector_.attacked(position.board, king.offset(direction, 0), opposite(position.turn))) return;
    out.push_back(Move{king, king.offset(2 * direction, 0), chess::Kind::Pawn, MoveKind::Castle});
  }

  static void moveRook(Position& position, const Move& move) {
    const bool kingSide = move.to.file() > move.from.file();
    const Square rookFrom(kingSide ? kRookFileKingSide : kRookFileQueenSide, move.from.rank());
    const Square rookTo(kingSide ? kRookFileKingSide - 2 : kRookFileQueenSide + 3, move.from.rank());
    position.board.place(rookTo, position.board.at(rookFrom));
    position.board.clear(rookFrom);
  }

  CheckDetector detector_;
};

class EnPassantRule : public SpecialMove {
 public:
  explicit EnPassantRule(const RuleTable& pieces) : pawns_(pieces.of(chess::Kind::Pawn)) {}

  void generate(const Position& position, Square from, std::vector<Move>& out) const override {
    if (!position.enPassant.valid() || position.board.at(from).kind != chess::Kind::Pawn) return;
    std::vector<Square> reach;
    pawns_.attacks(position.board, from, position.turn, reach);
    if (std::find(reach.begin(), reach.end(), position.enPassant) == reach.end()) return;
    out.push_back(Move{from, position.enPassant, chess::Kind::Pawn, MoveKind::EnPassant});
  }

  void afterMove(Position& position, const Move& move) const override {
    position.enPassant = Square();
    if (move.kind == MoveKind::DoublePush) position.enPassant = Square(move.from.file(), (move.from.rank() + move.to.rank()) / 2);
    if (move.kind == MoveKind::EnPassant) position.board.clear(Square(move.to.file(), move.from.rank()));
  }

 private:
  const PieceRules& pawns_;
};
