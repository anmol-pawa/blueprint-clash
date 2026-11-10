#include <optional>
#include <string>
#include "bp_test.h"
#include "solution.h"

namespace {
constexpr long long kNone = -999999999;
long long valueOr(const std::optional<long long>& v) { return v.value_or(kNone); }

// A rule the exercise's author never saw, nested inside the candidate's trees.
class Negate final : public Expr {
 public:
  explicit Negate(ExprPtr inner) : inner_(std::move(inner)) {}
  std::optional<long long> eval(const Context& c) const override {
    const auto v = inner_->eval(c);
    if (!v) return std::nullopt;
    return -*v;
  }
  std::string show() const override { return "-" + inner_->show(); }

 private:
  ExprPtr inner_;
};
}  // namespace

TEST(Calc, PrecedenceLivesInTheShapeOfTheTree) {
  Context c;
  // 2 + 3 * 4
  auto flat = add(num(2), mul(num(3), num(4)));
  EXPECT_EQ(valueOr(flat->eval(c)), 14LL);
  // (2 + 3) * 4
  auto grouped = mul(add(num(2), num(3)), num(4));
  EXPECT_EQ(valueOr(grouped->eval(c)), 20LL);
}

TEST(Calc, SubtractionKeepsOperandOrder) {
  Context c;
  EXPECT_EQ(valueOr(sub(num(10), num(3))->eval(c)), 7LL);
  EXPECT_EQ(valueOr(sub(num(3), num(10))->eval(c)), -7LL);
}

TEST(Calc, DivisionTruncatesTowardZero) {
  Context c;
  EXPECT_EQ(valueOr(divide(num(7), num(2))->eval(c)), 3LL);
  EXPECT_EQ(valueOr(divide(num(-7), num(2))->eval(c)), -3LL);
}

TEST(Calc, VariablesReadFromTheContext) {
  Context c;
  c.set("x", 6).set("y", 7);
  EXPECT_EQ(valueOr(mul(var("x"), var("y"))->eval(c)), 42LL);
}

TEST(Calc, UnknownVariableHasNoValue) {
  Context c;
  c.set("x", 1);
  EXPECT_FALSE(var("nope")->eval(c).has_value());
  EXPECT_FALSE(add(var("x"), var("nope"))->eval(c).has_value());
}

TEST(Calc, DivisionByZeroHasNoValue) {
  Context c;
  c.set("z", 0);
  EXPECT_FALSE(divide(num(1), num(0))->eval(c).has_value());
  EXPECT_FALSE(divide(num(1), var("z"))->eval(c).has_value());
}

TEST(Calc, ErrorsPropagateThroughEveryParent) {
  Context c;
  // 5 + (1 / 0): the bad subtree must not be read as 0
  auto tree = add(num(5), divide(num(1), num(0)));
  EXPECT_FALSE(tree->eval(c).has_value());
  auto deep = mul(num(2), sub(num(9), add(num(1), var("missing"))));
  EXPECT_FALSE(deep->eval(c).has_value());
}

TEST(Calc, SameTreeReevaluatesUnderANewContext) {
  auto tree = add(var("x"), num(1));
  Context a;
  a.set("x", 10);
  Context b;
  b.set("x", 20);
  EXPECT_EQ(valueOr(tree->eval(a)), 11LL);
  EXPECT_EQ(valueOr(tree->eval(b)), 21LL);
  EXPECT_EQ(valueOr(tree->eval(a)), 11LL);
}

TEST(Calc, ShowParenthesisesEveryBinaryNode) {
  auto tree = add(num(2), mul(var("x"), num(-4)));
  EXPECT_EQ(tree->show(), std::string("(2 + (x * -4))"));
  EXPECT_EQ(divide(sub(num(9), num(1)), num(2))->show(), std::string("((9 - 1) / 2)"));
}

TEST(Calc, NewRulesPlugInWithoutEditingTheOldOnes) {
  Context c;
  c.set("x", 5);
  ExprPtr tree = add(std::make_unique<Negate>(var("x")), num(8));
  EXPECT_EQ(valueOr(tree->eval(c)), 3LL);
  EXPECT_EQ(tree->show(), std::string("(-x + 8)"));
  ExprPtr bad = add(std::make_unique<Negate>(var("q")), num(8));
  EXPECT_FALSE(bad->eval(c).has_value());
}
