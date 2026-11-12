#pragma once
#include <cstddef>
#include <vector>

#include "api.h"

// The squares and the snakes and ladders on them. It knows nothing about players, dice or turns.
class Board {
 public:
  // True if the links obey the rules in api.h for a board of this size.
  static bool acceptsLinks(int size, const std::vector<snl::Link>& links) {
    if (size < 2) return false;
    std::vector<bool> isFrom(static_cast<std::size_t>(size) + 1, false);
    for (const auto& link : links) {
      if (!onBoard(size, link.from) || !onBoard(size, link.to)) return false;
      if (link.from == link.to || link.from == size || isFrom[link.from]) return false;
      isFrom[link.from] = true;
    }
    for (const auto& link : links) {
      if (isFrom[link.to]) return false;
    }
    return true;
  }

  Board(int size, const std::vector<snl::Link>& links) : size_(size), end_(static_cast<std::size_t>(size) + 1, 0) {
    for (const auto& link : links) end_[link.from] = link.to;
  }

  int size() const { return size_; }

  // Where a piece that stops on `square` ends up: the far end of a link, or the square itself.
  int endOf(int square) const { return end_[square] != 0 ? end_[square] : square; }

  snl::Jump jumpAt(int square) const {
    if (end_[square] == 0) return snl::Jump::None;
    return end_[square] > square ? snl::Jump::Ladder : snl::Jump::Snake;
  }

 private:
  static bool onBoard(int size, int square) { return square >= 1 && square <= size; }

  int size_;
  std::vector<int> end_;  // end_[s] is the far end of the link starting on s, or 0 if there is none
};
