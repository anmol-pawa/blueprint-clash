#pragma once
#include <memory>
#include <utility>
#include <vector>

#include "api.h"
#include "cellref.h"

// What an expression may ask of the sheet while it is evaluated.
class CellSource {
 public:
  virtual ~CellSource() = default;
  virtual sheet::Value valueOf(const CellRef& cell) const = 0;
  virtual bool occupied(const CellRef& cell) const = 0;
};

inline sheet::Value numberValue(long long number) {
  sheet::Value v;
  v.number = number;
  return v;
}

inline sheet::Value errorValue(sheet::Error error) {
  sheet::Value v;
  v.error = error;
  return v;
}

// A parsed formula is a tree of these (the Interpreter pattern): each node evaluates itself from its children.
class Expr {
 public:
  virtual ~Expr() = default;
  virtual sheet::Value eval(const CellSource& cells) const = 0;
  // Adds every cell this expression reads (ranges expanded, duplicates allowed).
  virtual void collectRefs(std::vector<CellRef>& out) const = 0;
};

class NumberExpr : public Expr {
 public:
  explicit NumberExpr(long long number) : number_(number) {}
  sheet::Value eval(const CellSource&) const override { return numberValue(number_); }
  void collectRefs(std::vector<CellRef>&) const override {}

 private:
  long long number_;
};

class RefExpr : public Expr {
 public:
  explicit RefExpr(const CellRef& cell) : cell_(cell) {}
  sheet::Value eval(const CellSource& cells) const override { return cells.valueOf(cell_); }
  void collectRefs(std::vector<CellRef>& out) const override { out.push_back(cell_); }

 private:
  CellRef cell_;
};

class NegateExpr : public Expr {
 public:
  explicit NegateExpr(std::unique_ptr<Expr> inner) : inner_(std::move(inner)) {}
  sheet::Value eval(const CellSource& cells) const override {
    const sheet::Value v = inner_->eval(cells);
    return v.error != sheet::Error::None ? v : numberValue(-v.number);
  }
  void collectRefs(std::vector<CellRef>& out) const override { inner_->collectRefs(out); }

 private:
  std::unique_ptr<Expr> inner_;
};

// One arithmetic operation on two numbers; false when it cannot be done (division by zero).
using Operation = bool (*)(long long left, long long right, long long& result);

inline bool addOp(long long l, long long r, long long& out) { out = l + r; return true; }
inline bool subtractOp(long long l, long long r, long long& out) { out = l - r; return true; }
inline bool multiplyOp(long long l, long long r, long long& out) { out = l * r; return true; }
inline bool divideOp(long long l, long long r, long long& out) {
  if (r == 0) return false;
  out = l / r;
  return true;
}

class BinaryExpr : public Expr {
 public:
  BinaryExpr(Operation operation, std::unique_ptr<Expr> left, std::unique_ptr<Expr> right)
      : operation_(operation), left_(std::move(left)), right_(std::move(right)) {}

  sheet::Value eval(const CellSource& cells) const override {
    const sheet::Value l = left_->eval(cells);
    const sheet::Value r = right_->eval(cells);
    if (l.error != sheet::Error::None) return l;
    if (r.error != sheet::Error::None) return r;
    long long result = 0;
    if (!operation_(l.number, r.number, result)) return errorValue(sheet::Error::DivideByZero);
    return numberValue(result);
  }

  void collectRefs(std::vector<CellRef>& out) const override {
    left_->collectRefs(out);
    right_->collectRefs(out);
  }

 private:
  Operation operation_;
  std::unique_ptr<Expr> left_;
  std::unique_ptr<Expr> right_;
};
