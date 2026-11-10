#pragma once
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>

// Variable bindings the tree is evaluated under. The tree itself holds no values.
class Context {
 public:
  Context& set(const std::string& name, long long value) {
    values_[name] = value;
    return *this;
  }

  std::optional<long long> lookup(const std::string& name) const {
    const auto it = values_.find(name);
    if (it == values_.end()) {
      return std::nullopt;
    }
    return it->second;
  }

 private:
  std::unordered_map<std::string, long long> values_;
};

// One grammar rule per class. nullopt means "no value": an unknown variable or a division by zero.
class Expr {
 public:
  virtual ~Expr() = default;
  virtual std::optional<long long> eval(const Context& context) const = 0;
  virtual std::string show() const = 0;
};

using ExprPtr = std::unique_ptr<Expr>;

class Num final : public Expr {
 public:
  explicit Num(long long value) : value_(value) {}
  std::optional<long long> eval(const Context&) const override { return value_; }
  std::string show() const override { return std::to_string(value_); }

 private:
  long long value_;
};

class Var final : public Expr {
 public:
  explicit Var(std::string name) : name_(std::move(name)) {}
  std::optional<long long> eval(const Context& context) const override {
    if (!cache_) {
      cache_ = context.lookup(name_);
    }
    return cache_;
  }
  std::string show() const override { return name_; }

 private:
  std::string name_;
  mutable std::optional<long long> cache_;
};

// Shared shape of a binary rule: evaluate both sides, propagate failure, then combine.
class BinaryExpr : public Expr {
 public:
  BinaryExpr(ExprPtr left, ExprPtr right) : left_(std::move(left)), right_(std::move(right)) {}

  std::optional<long long> eval(const Context& context) const final {
    const auto l = left_->eval(context);
    const auto r = right_->eval(context);
    if (!l || !r) {
      return std::nullopt;
    }
    return combine(*l, *r);
  }

  std::string show() const final { return "(" + left_->show() + " " + symbol() + " " + right_->show() + ")"; }

 protected:
  virtual std::optional<long long> combine(long long l, long long r) const = 0;
  virtual const char* symbol() const = 0;

 private:
  ExprPtr left_;
  ExprPtr right_;
};

class Add final : public BinaryExpr {
 public:
  using BinaryExpr::BinaryExpr;

 protected:
  std::optional<long long> combine(long long l, long long r) const override { return l + r; }
  const char* symbol() const override { return "+"; }
};

class Sub final : public BinaryExpr {
 public:
  using BinaryExpr::BinaryExpr;

 protected:
  std::optional<long long> combine(long long l, long long r) const override { return l - r; }
  const char* symbol() const override { return "-"; }
};

class Mul final : public BinaryExpr {
 public:
  using BinaryExpr::BinaryExpr;

 protected:
  std::optional<long long> combine(long long l, long long r) const override { return l * r; }
  const char* symbol() const override { return "*"; }
};

class Div final : public BinaryExpr {
 public:
  using BinaryExpr::BinaryExpr;

 protected:
  std::optional<long long> combine(long long l, long long r) const override {
    if (r == 0) {
      return std::nullopt;
    }
    return l / r;
  }
  const char* symbol() const override { return "/"; }
};

inline ExprPtr num(long long value) { return std::make_unique<Num>(value); }
inline ExprPtr var(std::string name) { return std::make_unique<Var>(std::move(name)); }
inline ExprPtr add(ExprPtr l, ExprPtr r) { return std::make_unique<Add>(std::move(l), std::move(r)); }
inline ExprPtr sub(ExprPtr l, ExprPtr r) { return std::make_unique<Sub>(std::move(l), std::move(r)); }
inline ExprPtr mul(ExprPtr l, ExprPtr r) { return std::make_unique<Mul>(std::move(l), std::move(r)); }
inline ExprPtr divide(ExprPtr l, ExprPtr r) { return std::make_unique<Div>(std::move(l), std::move(r)); }
