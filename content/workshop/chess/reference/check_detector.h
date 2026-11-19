#pragma once
#include <algorithm>
#include <vector>

#include "piece_rules.h"

// Answers "is this square attacked?" and "is this king in check?" by asking every enemy piece what it attacks.
class CheckDetector {
 public:
  explicit CheckDetector(const RuleTable& pieces) : pieces_(pieces) {}

  bool attacked(const Board& board, Square target, chess::Color by) const {
    std::vector<Square> reach;
    for (const Square& from : board.squaresOf(by)) {
      reach.clear();
      pieces_.of(board.at(from).kind).attacks(board, from, by, reach);
      if (std::find(reach.begin(), reach.end(), target) != reach.end()) return true;
    }
    return false;
  }

  bool inCheck(const Board& board, chess::Color side) const {
    Square king;
    return board.findKing(side, king) && attacked(board, king, opposite(side));
  }

 private:
  const RuleTable& pieces_;
};
