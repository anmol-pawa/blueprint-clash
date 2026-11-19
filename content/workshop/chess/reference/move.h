#pragma once
#include "api_storm2.h"
#include "square.h"

enum class MoveKind { Normal, DoublePush, Castle, EnPassant };

// One move: where from, where to, and what a pawn becomes on the last rank. Kind::Pawn in promoteTo means "no promotion".
struct Move {
  Square from;
  Square to;
  chess::Kind promoteTo = chess::Kind::Pawn;
  MoveKind kind = MoveKind::Normal;
};

inline bool promotes(const Move& move) { return move.promoteTo != chess::Kind::Pawn; }
