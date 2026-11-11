#pragma once
#include "board.h"

// Does the mark just placed complete a line of `length` or more? Only lines through the last move can be new,
// so we count outwards from it in the four line directions (row, column, two diagonals).
class LineWinRule {
 public:
  explicit LineWinRule(int length) : length_(length) {}

  int length() const { return length_; }

  bool completedBy(const Board& board, int row, int col) const {
    for (const auto& dir : kDirections) {
      int run = 1 + countTowards(board, row, col, dir[0], dir[1]) + countTowards(board, row, col, -dir[0], -dir[1]);
      if (run >= length_) return true;
    }
    return false;
  }

 private:
  static constexpr int kDirections[4][2] = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};

  // How many more cells with the same mark lie in this direction, not counting the starting cell.
  static int countTowards(const Board& board, int row, int col, int dRow, int dCol) {
    const char mark = board.at(row, col);
    int count = 0;
    row += dRow;
    col += dCol;
    while (board.inBounds(row, col) && board.at(row, col) == mark) {
      ++count;
      row += dRow;
      col += dCol;
    }
    return count;
  }

  int length_;
};
