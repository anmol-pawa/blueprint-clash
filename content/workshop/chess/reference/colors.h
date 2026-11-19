#pragma once
#include "api_storm2.h"

// Everything that depends on which side a piece belongs to, in one place.
inline chess::Color opposite(chess::Color color) { return color == chess::Color::White ? chess::Color::Black : chess::Color::White; }
inline int forwardStep(chess::Color color) { return color == chess::Color::White ? 1 : -1; }
inline int homeRank(chess::Color color) { return color == chess::Color::White ? 0 : 7; }
inline int pawnRank(chess::Color color) { return color == chess::Color::White ? 1 : 6; }
inline int lastRank(chess::Color color) { return color == chess::Color::White ? 7 : 0; }
inline int sideIndex(chess::Color color) { return static_cast<int>(color); }
