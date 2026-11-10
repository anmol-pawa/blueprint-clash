#pragma once
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>

// TODO: one class per grammar rule (Num, Var, Add, Sub, Mul, Div), each owning its children.
// eval returns nullopt for an unknown variable or division by zero, and that propagates upward.
// show() is fully parenthesised: "(left op right)".
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

class Expr {
 public:
  virtual ~Expr() = default;
  virtual std::optional<long long> eval(const Context& context) const = 0;
  virtual std::string show() const = 0;
};

using ExprPtr = std::unique_ptr<Expr>;

class Stub final : public Expr {
 public:
  std::optional<long long> eval(const Context&) const override { return std::nullopt; }
  std::string show() const override { return ""; }
};

inline ExprPtr num(long long) { return std::make_unique<Stub>(); }
inline ExprPtr var(std::string) { return std::make_unique<Stub>(); }
inline ExprPtr add(ExprPtr, ExprPtr) { return std::make_unique<Stub>(); }
inline ExprPtr sub(ExprPtr, ExprPtr) { return std::make_unique<Stub>(); }
inline ExprPtr mul(ExprPtr, ExprPtr) { return std::make_unique<Stub>(); }
inline ExprPtr divide(ExprPtr, ExprPtr) { return std::make_unique<Stub>(); }
