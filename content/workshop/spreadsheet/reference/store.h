#pragma once
#include <map>
#include <memory>
#include <string>

#include "expr.h"

// One stored cell: what was typed, its parsed form, and the value it currently shows.
struct Cell {
  std::string text;
  std::unique_ptr<Expr> expr;
  bool isFormula = false;
  sheet::Value value;
};

// The cells that are not empty, and the answers an expression may ask about them.
class CellStore : public CellSource {
 public:
  sheet::Value valueOf(const CellRef& cell) const override {
    const Cell* found = find(cell.index());
    return found == nullptr ? numberValue(0) : found->value;
  }

  bool occupied(const CellRef& cell) const override { return find(cell.index()) != nullptr; }

  const Cell* find(int index) const {
    const auto it = cells_.find(index);
    return it == cells_.end() ? nullptr : &it->second;
  }

  Cell* find(int index) {
    const auto it = cells_.find(index);
    return it == cells_.end() ? nullptr : &it->second;
  }

  void put(int index, Cell cell) { cells_[index] = std::move(cell); }
  void erase(int index) { cells_.erase(index); }

 private:
  std::map<int, Cell> cells_;
};
