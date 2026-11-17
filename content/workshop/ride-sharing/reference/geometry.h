#pragma once
#include <cstdlib>

#include "api.h"

// The only place that knows what "distance" and "on the grid" mean.
inline long long manhattan(const ride::Location& a, const ride::Location& b) {
  return std::llabs(a.x - b.x) + std::llabs(a.y - b.y);
}

inline bool onGrid(const ride::Location& p) {
  return std::llabs(p.x) <= ride::kMaxCoordinate && std::llabs(p.y) <= ride::kMaxCoordinate;
}

inline bool sameSpot(const ride::Location& a, const ride::Location& b) { return a.x == b.x && a.y == b.y; }
