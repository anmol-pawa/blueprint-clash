#pragma once
#include <cctype>
#include <string>
#include <vector>

#include "check_detector.h"
#include "position.h"

// Turns the eight text rows of makeGameFrom() into a Position, or refuses a position that cannot exist.
class PositionParser {
 public:
  explicit PositionParser(const CheckDetector& detector) : detector_(detector) {}

  static std::vector<std::string> startRows() {
    return {"rnbqkbnr", "pppppppp", "........", "........", "........", "........", "PPPPPPPP", "RNBQKBNR"};
  }

  bool parse(const std::vector<std::string>& rows, chess::Color toMove, Position& out) const {
    if (rows.size() != 8) return false;
    Position position;
    position.turn = toMove;
    int kings[2] = {0, 0};
    for (int row = 0; row < 8; ++row) {
      if (rows[row].size() != 8) return false;
      for (int file = 0; file < 8; ++file) {
        if (rows[row][file] == '.') continue;
        chess::Piece piece{chess::Color::White, chess::Kind::Pawn};
        if (!decode(rows[row][file], piece)) return false;
        const Square at(file, 7 - row);
        if (piece.kind == chess::Kind::Pawn && (at.rank() == 0 || at.rank() == 7)) return false;
        if (piece.kind == chess::Kind::King) ++kings[sideIndex(piece.color)];
        position.board.place(at, piece);
      }
    }
    if (kings[0] != 1 || kings[1] != 1) return false;
    if (detector_.inCheck(position.board, opposite(toMove))) return false;
    inferCastleRights(position);
    out = position;
    return true;
  }

 private:
  static bool decode(char letter, chess::Piece& out) {
    static const std::string kKinds = "pnbrqk";
    const std::size_t found = kKinds.find(static_cast<char>(std::tolower(static_cast<unsigned char>(letter))));
    if (found == std::string::npos) return false;
    out = chess::Piece{std::isupper(static_cast<unsigned char>(letter)) ? chess::Color::White : chess::Color::Black, static_cast<chess::Kind>(found)};
    return true;
  }

  // A king on its home square and a rook of its colour in a corner count as never moved.
  static void inferCastleRights(Position& position) {
    for (const chess::Color side : {chess::Color::White, chess::Color::Black}) {
      const int rank = homeRank(side);
      const bool kingHome = position.board.holds(Square(4, rank), side, chess::Kind::King);
      position.rights.kingSide[sideIndex(side)] = kingHome && position.board.holds(Square(7, rank), side, chess::Kind::Rook);
      position.rights.queenSide[sideIndex(side)] = kingHome && position.board.holds(Square(0, rank), side, chess::Kind::Rook);
    }
  }

  const CheckDetector& detector_;
};
