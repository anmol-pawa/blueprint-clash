#pragma once
#include <cstdlib>

#include "api_storm2.h"

// The map is a grid; driving distance is counted in blocks. Both questions about space live here and nowhere else.
class Grid {
 public:
  static int blocksBetween(ride::Point from, ride::Point to) {
    return std::abs(from.x - to.x) + std::abs(from.y - to.y);
  }

  static bool onTheMap(ride::Point point) {
    return std::abs(point.x) <= ride::kMaxCoordinate && std::abs(point.y) <= ride::kMaxCoordinate;
  }

  static bool samePlace(ride::Point first, ride::Point second) { return first.x == second.x && first.y == second.y; }
};
