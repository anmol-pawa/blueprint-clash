#pragma once
#include <memory>
#include <string>
#include <vector>

#include "expr.h"

// A function over a range of cells (Strategy): SUM, MIN, MAX and COUNT are four of these.
class Aggregate {
 public:
  virtual ~Aggregate() = default;
  virtual sheet::Value over(const CellRange& range, const CellSource& cells) const = 0;
};

// Shared shape of SUM, MIN and MAX: read every value, stop at the first error, fold the numbers (Template Method).
class FoldAggregate : public Aggregate {
 public:
  sheet::Value over(const CellRange& range, const CellSource& cells) const override {
    long long folded = 0;
    bool first = true;
    for (const CellRef& cell : range.cells()) {
      const sheet::Value v = cells.valueOf(cell);
      if (v.error != sheet::Error::None) return v;
      folded = first ? v.number : combine(folded, v.number);
      first = false;
    }
    return numberValue(folded);
  }

 protected:
  virtual long long combine(long long folded, long long next) const = 0;
};

class SumAggregate : public FoldAggregate {
 protected:
  long long combine(long long folded, long long next) const override { return folded + next; }
};

class MinAggregate : public FoldAggregate {
 protected:
  long long combine(long long folded, long long next) const override { return next < folded ? next : folded; }
};

class MaxAggregate : public FoldAggregate {
 protected:
  long long combine(long long folded, long long next) const override { return next > folded ? next : folded; }
};

class CountAggregate : public Aggregate {
 public:
  sheet::Value over(const CellRange& range, const CellSource& cells) const override {
    long long count = 0;
    for (const CellRef& cell : range.cells()) count += cells.occupied(cell) ? 1 : 0;
    return numberValue(count);
  }
};

// The function named `name`, or null.
inline const Aggregate* findAggregate(const std::string& name) {
  static const SumAggregate sum;
  static const MinAggregate min;
  static const MaxAggregate max;
  static const CountAggregate count;
  if (name == "SUM") return &sum;
  if (name == "MIN") return &min;
  if (name == "MAX") return &max;
  if (name == "COUNT") return &count;
  return nullptr;
}

class CallExpr : public Expr {
 public:
  CallExpr(const Aggregate& function, const CellRange& range) : function_(function), range_(range) {}
  sheet::Value eval(const CellSource& cells) const override { return function_.over(range_, cells); }
  void collectRefs(std::vector<CellRef>& out) const override {
    for (const CellRef& cell : range_.cells()) out.push_back(cell);
  }

 private:
  const Aggregate& function_;
  CellRange range_;
};
