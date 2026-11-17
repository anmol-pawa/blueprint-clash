#pragma once
#include <cstddef>
#include <string>
#include <vector>

constexpr int kColumns = 26;
constexpr int kRows = 99;

// One cell address. The only code that knows how "C10" maps to a column, a row and a dense index.
class CellRef {
 public:
  CellRef() = default;
  CellRef(int column, int row) : column_(column), row_(row) {}

  // "A1".."Z99". Lower case, leading zeros and anything outside the grid are refused.
  static bool parse(const std::string& text, CellRef& out) {
    if (text.size() < 2 || text.size() > 3) return false;
    if (text[0] < 'A' || text[0] > 'Z') return false;
    if (text[1] < '1' || text[1] > '9') return false;
    int row = 0;
    for (std::size_t i = 1; i < text.size(); ++i) {
      if (text[i] < '0' || text[i] > '9') return false;
      row = row * 10 + (text[i] - '0');
    }
    if (row > kRows) return false;
    out = CellRef(text[0] - 'A', row - 1);
    return true;
  }

  static CellRef fromIndex(int index) { return CellRef(index % kColumns, index / kColumns); }

  int column() const { return column_; }
  int row() const { return row_; }
  int index() const { return row_ * kColumns + column_; }
  std::string name() const { return std::string(1, static_cast<char>('A' + column_)) + std::to_string(row_ + 1); }

 private:
  int column_ = 0;
  int row_ = 0;
};

// A rectangle of cells, named by two opposite corners in any order.
class CellRange {
 public:
  CellRange(const CellRef& a, const CellRef& b)
      : left_(a.column() < b.column() ? a.column() : b.column()),
        right_(a.column() < b.column() ? b.column() : a.column()),
        top_(a.row() < b.row() ? a.row() : b.row()),
        bottom_(a.row() < b.row() ? b.row() : a.row()) {}

  // Row by row, left to right.
  std::vector<CellRef> cells() const {
    std::vector<CellRef> out;
    for (int row = top_; row <= bottom_; ++row) {
      for (int column = left_; column <= right_; ++column) out.emplace_back(column, row);
    }
    return out;
  }

 private:
  int left_;
  int right_;
  int top_;
  int bottom_;
};
