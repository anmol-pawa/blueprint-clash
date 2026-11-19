#pragma once
// Change Storm 2: taking moves back.
#include <cstddef>

#include "api_storm1.h"

namespace chess {

// A full-rules game (castling and en passant) that can take its moves back.
//
// undo() takes back the last move that move() accepted: the board, the side to move, the captured piece, a promotion, a
// castling's rook, the castling rights, the en passant chance and the outcome all return to exactly what they were before
// that move, so the game continues as if it had not been played. Only moves made through move() on THIS object can be
// taken back: the position a game was created from is the bottom of the history, and undo() there is NothingToUndo, as it is
// after every move has been taken back. A refused move is not part of the history. undo() works after checkmate and stalemate
// too (the game is Ongoing again). moveCount() is the number of moves undo() can still take back.
class UndoGame : public Game {
 public:
  virtual Status undo() = 0;
  virtual std::size_t moveCount() const = 0;
};

std::unique_ptr<UndoGame> makeUndoGame();
std::unique_ptr<UndoGame> makeUndoGameFrom(const std::vector<std::string>& rows, Color toMove);

}  // namespace chess
