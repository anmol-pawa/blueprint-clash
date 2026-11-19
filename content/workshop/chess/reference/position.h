#pragma once
#include "board.h"

// Who may still castle, per colour (indexed by sideIndex): the king has not moved and that rook has not moved or been captured.
struct CastleRights {
  bool kingSide[2] = {false, false};
  bool queenSide[2] = {false, false};
};

// Everything that decides what can happen next. A value: one history entry is one copy of it.
struct Position {
  Board board;
  chess::Color turn = chess::Color::White;
  CastleRights rights;
  Square enPassant;  // the square a pawn has just skipped with a two-square advance, or nowhere
};
