#pragma once
#include <array>
#include <vector>

#include "api_storm2.h"
#include "square.h"

// Which piece stands where. A plain value: copying it is how a trial move is tried.
class Board {
 public:
  bool occupied(Square square) const { return cells_[square.index()].present; }
  chess::Piece at(Square square) const { return cells_[square.index()].piece; }
  void place(Square square, chess::Piece piece) { cells_[square.index()] = Cell{true, piece}; }
  void clear(Square square) { cells_[square.index()] = Cell{}; }

  bool holds(Square square, chess::Color color, chess::Kind kind) const {
    return occupied(square) && at(square).color == color && at(square).kind == kind;
  }

  std::vector<Square> squaresOf(chess::Color color) const {
    std::vector<Square> found;
    for (int rank = 0; rank < 8; ++rank) {
      for (int file = 0; file < 8; ++file) {
        const Square square(file, rank);
        if (occupied(square) && at(square).color == color) found.push_back(square);
      }
    }
    return found;
  }

  bool findKing(chess::Color color, Square& out) const {
    for (const Square& square : squaresOf(color)) {
      if (at(square).kind == chess::Kind::King) {
        out = square;
        return true;
      }
    }
    return false;
  }

 private:
  struct Cell {
    bool present = false;
    chess::Piece piece{chess::Color::White, chess::Kind::Pawn};
  };

  std::array<Cell, 64> cells_{};
};
