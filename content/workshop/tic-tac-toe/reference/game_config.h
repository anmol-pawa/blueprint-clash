#pragma once
#include <algorithm>

// Board size and winning length, and the one place that says which combinations make sense.
class GameConfig {
 public:
  static constexpr int kClassicSize = 3;

  GameConfig() = default;
  GameConfig(int rows, int cols, int winLength) : rows_(rows), cols_(cols), winLength_(winLength) {}

  int rows() const { return rows_; }
  int cols() const { return cols_; }
  int winLength() const { return winLength_; }

  // A line must fit on the board, otherwise nobody could ever win.
  bool valid() const { return rows_ >= 1 && cols_ >= 1 && winLength_ >= 1 && winLength_ <= std::max(rows_, cols_); }

 private:
  int rows_ = kClassicSize;
  int cols_ = kClassicSize;
  int winLength_ = kClassicSize;
};
