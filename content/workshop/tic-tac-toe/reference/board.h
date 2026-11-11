#pragma once
#include <cstddef>
#include <vector>

// The grid: size, contents and bounds. It knows nothing about turns or winning.
class Board {
 public:
  static constexpr char kEmpty = '.';

  Board(int rows, int cols) : rows_(rows), cols_(cols), cells_(static_cast<std::size_t>(rows) * cols, kEmpty) {}

  int rows() const { return rows_; }
  int cols() const { return cols_; }
  bool inBounds(int row, int col) const { return row >= 0 && row < rows_ && col >= 0 && col < cols_; }
  char at(int row, int col) const { return cells_[index(row, col)]; }
  bool isEmpty(int row, int col) const { return at(row, col) == kEmpty; }
  bool full() const { return filled_ == cells_.size(); }

  void place(int row, int col, char mark) {
    cells_[index(row, col)] = mark;
    ++filled_;
  }
  void clear(int row, int col) {
    cells_[index(row, col)] = kEmpty;
    --filled_;
  }

 private:
  std::size_t index(int row, int col) const { return static_cast<std::size_t>(row) * cols_ + col; }

  int rows_;
  int cols_;
  std::vector<char> cells_;
  std::size_t filled_ = 0;
};
