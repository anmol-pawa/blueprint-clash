#pragma once
#include <cstdlib>

#include "api.h"

// Grid maths in one place: validity of a point and the |dx| + |dy| distance.
class Grid {
 public:
  static bool contains(const ride::Point& p) {
    return p.x >= 0 && p.x <= ride::kMaxCoordinate && p.y >= 0 && p.y <= ride::kMaxCoordinate;
  }
  static int distance(const ride::Point& a, const ride::Point& b) { return std::abs(a.x - b.x) + std::abs(a.y - b.y); }
  static bool same(const ride::Point& a, const ride::Point& b) { return a.x == b.x && a.y == b.y; }
};
