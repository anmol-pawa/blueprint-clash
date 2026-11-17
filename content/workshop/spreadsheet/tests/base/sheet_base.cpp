#include <map>
#include <memory>
#include <random>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
using sheet::Error;
using sheet::Status;
using sheet::Value;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

// "7" for a number, "#DIV/0" for the error.
std::string show(const Value& v) { return v.error == Error::DivideByZero ? "#DIV/0" : std::to_string(v.number); }

struct Fixture {
  std::unique_ptr<sheet::Sheet> s = sheet::makeSheet();
  Status set(const std::string& cell, const std::string& text) { return s->set(cell, text); }
  std::string at(const std::string& cell) {
    Value v;
    v.number = -999;
    return s->get(cell, v) == Status::Ok ? show(v) : "<invalid>";
  }
  std::string text(const std::string& cell) {
    std::string t = "<unset>";
    return s->text(cell, t) == Status::Ok ? t : "<invalid>";
  }
  // Sets a formula and returns how many evaluations it caused.
  std::size_t cost(const std::string& cell, const std::string& text) {
    const std::size_t before = s->evaluations();
    s->set(cell, text);
    return s->evaluations() - before;
  }
};
}  // namespace

TEST(Cells, EmptyCellsReadAsZeroAndCellNamesAreChecked) {
  Fixture f;
  EXPECT_EQ(f.at("A1"), std::string("0"));
  EXPECT_EQ(f.at("Z99"), std::string("0"));
  EXPECT_EQ(f.text("C10"), std::string(""));
  for (const char* bad : {"", "a1", "A0", "A01", "A100", "AA1", "1A", "A", "A1 ", " A1", "[1", "A-1"}) {
    Value v;
    v.number = 5;
    EXPECT_TRUE(f.s->get(bad, v) == Status::InvalidCell);
    EXPECT_EQ(v.number, 5LL);
    IS(f.set(bad, "1"), InvalidCell);
    std::string t = "keep";
    IS(f.s->text(bad, t), InvalidCell);
    EXPECT_EQ(t, std::string("keep"));
  }
  EXPECT_EQ(f.s->evaluations(), 0u);
}

TEST(Cells, LiteralsAreStoredAndReadBackExactlyAndAnEmptyTextClears) {
  Fixture f;
  IS(f.set("A1", "42"), Ok);
  IS(f.set("B2", "-7"), Ok);
  IS(f.set("C3", "007"), Ok);
  IS(f.set("D4", "999999999"), Ok);
  IS(f.set("E5", "-0"), Ok);
  EXPECT_EQ(f.at("A1"), std::string("42"));
  EXPECT_EQ(f.at("B2"), std::string("-7"));
  EXPECT_EQ(f.at("C3"), std::string("7"));
  EXPECT_EQ(f.at("D4"), std::string("999999999"));
  EXPECT_EQ(f.at("E5"), std::string("0"));
  EXPECT_EQ(f.text("C3"), std::string("007"));
  EXPECT_EQ(f.text("B2"), std::string("-7"));
  IS(f.set("A1", ""), Ok);
  EXPECT_EQ(f.at("A1"), std::string("0"));
  EXPECT_EQ(f.text("A1"), std::string(""));
  IS(f.set("A1", "5"), Ok);
  IS(f.set("A1", "6"), Ok);
  EXPECT_EQ(f.at("A1"), std::string("6"));
  EXPECT_EQ(f.s->evaluations(), 0u);
}

TEST(Cells, BadInputIsRejectedAndChangesNothing) {
  Fixture f;
  IS(f.set("A1", "5"), Ok);
  IS(f.set("B1", "=A1+1"), Ok);
  const std::size_t evals = f.s->evaluations();
  for (const char* bad : {"+5", "4.5", " 4", "4 ", "1000000000", "-1000000000", "-", "hello", "=", "= ", "=1+", "=*2", "=(1", "=1)", "=1 2",
                          "=A", "=A0", "=A100", "=a1", "=AA1", "=A1A", "=A01", "=1+*2", "=()", "=--", "=1/", "=SUM(A1:A2)", "=1.5", "=1000000000",
                          "=B1 B1", "=A1:A2", "=#", "=\"x\""}) {
    IS(f.set("A1", bad), InvalidFormula);
    IS(f.set("C1", bad), InvalidFormula);
  }
  EXPECT_EQ(f.at("A1"), std::string("5"));
  EXPECT_EQ(f.text("A1"), std::string("5"));
  EXPECT_EQ(f.at("B1"), std::string("6"));
  EXPECT_EQ(f.text("C1"), std::string(""));
  EXPECT_EQ(f.s->evaluations(), evals);
  // The cell name is checked before the text.
  IS(f.set("a1", "=1+"), InvalidCell);
}

TEST(Formula, PrecedenceAssociativityAndParentheses) {
  Fixture f;
  struct Case { const char* formula; const char* expected; };
  const Case cases[] = {
      {"=2+3*4", "14"},        {"=(2+3)*4", "20"},     {"=10-2-3", "5"},       {"=100/10/5", "2"},    {"=2*3+4*5", "26"},
      {"=8/2*3", "12"},        {"=-5+2", "-3"},        {"=-(2+3)", "-5"},      {"=--3", "3"},         {"=2*-3", "-6"},
      {"=7/2", "3"},           {"=-7/2", "-3"},        {"=7/-2", "-3"},        {"=1-(2-3)", "2"},     {"= 1 +  2 * 3 ", "7"},
      {"=((((4))))", "4"},     {"=999999999*999999999", "999999998000000001"},   {"=20/3/2", "3"},      {"=3-4*2/2+1", "0"},
  };
  for (const Case& c : cases) {
    IS(f.set("A1", c.formula), Ok);
    EXPECT_EQ(f.at("A1"), std::string(c.expected));
  }
}

TEST(Formula, ReferencesReadOtherCellsAndEmptyOnesAreZero) {
  Fixture f;
  f.set("A1", "10");
  f.set("B1", "=A1*2");
  f.set("C1", "=A1+B1+D9");
  f.set("D1", "=-C1");
  f.set("E1", "=(A1+B1)*(C1-B1)");
  EXPECT_EQ(f.at("B1"), std::string("20"));
  EXPECT_EQ(f.at("C1"), std::string("30"));
  EXPECT_EQ(f.at("D1"), std::string("-30"));
  EXPECT_EQ(f.at("E1"), std::string("300"));
  EXPECT_EQ(f.text("E1"), std::string("=(A1+B1)*(C1-B1)"));
  IS(f.set("Z99", "=A1 + Z98"), Ok);
  EXPECT_EQ(f.at("Z99"), std::string("10"));
}

TEST(Formula, DivisionByZeroIsAnErrorThatFlowsDownhillAndClears) {
  Fixture f;
  f.set("A1", "0");
  f.set("B1", "=10/A1");
  EXPECT_EQ(f.at("B1"), std::string("#DIV/0"));
  f.set("C1", "=B1+1");
  f.set("D1", "=2*C1");
  f.set("E1", "=-D1");
  EXPECT_EQ(f.at("C1"), std::string("#DIV/0"));
  EXPECT_EQ(f.at("E1"), std::string("#DIV/0"));
  f.set("F1", "=0*(1/0)");
  EXPECT_EQ(f.at("F1"), std::string("#DIV/0"));
  f.set("G1", "=(1/0)-(1/0)");
  EXPECT_EQ(f.at("G1"), std::string("#DIV/0"));
  Value v;
  EXPECT_TRUE(f.s->get("B1", v) == Status::Ok);
  EXPECT_EQ(v.number, 0LL);
  f.set("A1", "5");
  EXPECT_EQ(f.at("B1"), std::string("2"));
  EXPECT_EQ(f.at("C1"), std::string("3"));
  EXPECT_EQ(f.at("D1"), std::string("6"));
  EXPECT_EQ(f.at("E1"), std::string("-6"));
  f.set("A1", "0");
  EXPECT_EQ(f.at("E1"), std::string("#DIV/0"));
  f.set("A1", "");
  EXPECT_EQ(f.at("E1"), std::string("#DIV/0"));
}

TEST(Recalc, ChangesReachEveryDependentThroughChains) {
  Fixture f;
  f.set("A1", "1");
  f.set("B1", "=A1+1");
  f.set("C1", "=B1+1");
  f.set("D1", "=C1+1");
  EXPECT_EQ(f.at("D1"), std::string("4"));
  f.set("A1", "10");
  EXPECT_EQ(f.at("B1"), std::string("11"));
  EXPECT_EQ(f.at("C1"), std::string("12"));
  EXPECT_EQ(f.at("D1"), std::string("13"));
  f.set("A1", "");
  EXPECT_EQ(f.at("D1"), std::string("3"));
  f.set("B1", "100");
  EXPECT_EQ(f.at("C1"), std::string("101"));
  EXPECT_EQ(f.at("D1"), std::string("102"));
}

TEST(Recalc, AFormulaMayReadACellThatIsFilledInLater) {
  Fixture f;
  f.set("A1", "=B1*2");
  f.set("C1", "=A1+B1");
  EXPECT_EQ(f.at("C1"), std::string("0"));
  f.set("B1", "7");
  EXPECT_EQ(f.at("A1"), std::string("14"));
  EXPECT_EQ(f.at("C1"), std::string("21"));
}

TEST(Recalc, AChainBuiltBackwardsIsEvaluatedInDependencyOrder) {
  Fixture f;
  // Cell index order (row by row, then column) is the OPPOSITE of dependency order here.
  f.set("A1", "1");
  f.set("D1", "=A1+1");
  f.set("C1", "=D1+1");
  f.set("B1", "=C1+1");
  EXPECT_EQ(f.at("B1"), std::string("4"));
  const std::size_t before = f.s->evaluations();
  f.set("A1", "100");
  EXPECT_EQ(f.at("D1"), std::string("101"));
  EXPECT_EQ(f.at("C1"), std::string("102"));
  EXPECT_EQ(f.at("B1"), std::string("103"));
  EXPECT_EQ(f.s->evaluations() - before, 3u);
  // Lower rows read higher rows too.
  f.set("A5", "1");
  f.set("A3", "=A5*2");
  f.set("A2", "=A3*2");
  f.set("A1", "=A2*2");
  f.set("A5", "3");
  EXPECT_EQ(f.at("A1"), std::string("24"));
}

TEST(Recalc, ADiamondEvaluatesEachDependentExactlyOnce) {
  Fixture f;
  f.set("A1", "1");
  f.set("B1", "=A1+1");
  f.set("C1", "=A1*2");
  f.set("D1", "=B1+C1");
  f.set("E1", "=D1+B1");
  const std::size_t before = f.s->evaluations();
  IS(f.set("A1", "5"), Ok);
  EXPECT_EQ(f.at("B1"), std::string("6"));
  EXPECT_EQ(f.at("C1"), std::string("10"));
  EXPECT_EQ(f.at("D1"), std::string("16"));
  EXPECT_EQ(f.at("E1"), std::string("22"));
  EXPECT_EQ(f.s->evaluations() - before, 4u);
  // A tall ladder of diamonds would take 2^n evaluations if each path were followed separately.
  Fixture g;
  g.set("A1", "1");
  for (int row = 2; row <= 20; ++row) {
    const std::string up = "A" + std::to_string(row - 1);
    g.set("A" + std::to_string(row), "=" + up + "+" + up);
  }
  const std::size_t base = g.s->evaluations();
  g.set("A1", "2");
  EXPECT_EQ(g.at("A20"), std::string("1048576"));
  EXPECT_EQ(g.s->evaluations() - base, 19u);
}

TEST(Recalc, OnlyTheDependentsOfTheEditedCellAreEvaluated) {
  Fixture f;
  f.set("A1", "1");
  f.set("B1", "=A1+1");
  f.set("A2", "1");
  f.set("B2", "=A2+1");
  f.set("C2", "=B2+B1");
  EXPECT_EQ(f.cost("A1", "2"), 2u);  // B1 and C1... C2 reads B1, so B1 and C2
  EXPECT_EQ(f.cost("A2", "2"), 2u);  // B2 and C2
  EXPECT_EQ(f.cost("C2", "=A1+A2"), 1u);
  EXPECT_EQ(f.cost("C2", "7"), 0u);
  EXPECT_EQ(f.cost("D9", "=A1"), 1u);
  EXPECT_EQ(f.cost("D9", ""), 0u);
  EXPECT_EQ(f.cost("Z9", "5"), 0u);
}

TEST(Recalc, ReplacingAFormulaForgetsItsOldDependencies) {
  Fixture f;
  f.set("A1", "1");
  f.set("A2", "2");
  f.set("B1", "=A1+1");
  EXPECT_EQ(f.cost("A1", "5"), 1u);
  f.set("B1", "=A2+1");
  EXPECT_EQ(f.at("B1"), std::string("3"));
  EXPECT_EQ(f.cost("A1", "9"), 0u);  // B1 no longer reads A1
  EXPECT_EQ(f.cost("A2", "9"), 1u);
  EXPECT_EQ(f.at("B1"), std::string("10"));
  f.set("B1", "42");  // a literal reads nothing
  EXPECT_EQ(f.cost("A2", "1"), 0u);
  EXPECT_EQ(f.at("B1"), std::string("42"));
  f.set("B1", "=A1+A2");
  f.set("B1", "");
  EXPECT_EQ(f.cost("A1", "3"), 0u);
  EXPECT_EQ(f.at("B1"), std::string("0"));
}

TEST(Cycle, SelfAndIndirectCyclesAreRefused) {
  Fixture f;
  IS(f.set("A1", "=A1"), Cycle);
  IS(f.set("A1", "=1+A1*2"), Cycle);
  f.set("A1", "=B1");
  f.set("B1", "=C1");
  IS(f.set("C1", "=A1"), Cycle);
  IS(f.set("C1", "=1+(B1)"), Cycle);
  IS(f.set("B1", "=A1+1"), Cycle);
  IS(f.set("C1", "=D1+A1"), Cycle);
  IS(f.set("C1", "=5"), Ok);
  f.set("D1", "=A1");
  IS(f.set("C1", "=D1"), Cycle);
  IS(f.set("C1", "=Z1+D1"), Cycle);
}

TEST(Cycle, ARefusedSetChangesNothingNotEvenTheEvaluationCount) {
  Fixture f;
  f.set("A1", "=B1+1");
  f.set("B1", "=C1+1");
  f.set("C1", "5");
  f.set("D1", "=A1*2");
  EXPECT_EQ(f.at("D1"), std::string("14"));
  const std::size_t evals = f.s->evaluations();
  IS(f.set("C1", "=D1"), Cycle);
  EXPECT_EQ(f.text("C1"), std::string("5"));
  EXPECT_EQ(f.at("C1"), std::string("5"));
  EXPECT_EQ(f.at("D1"), std::string("14"));
  EXPECT_EQ(f.s->evaluations(), evals);
  // The old dependencies are still wired: a later edit still flows through.
  f.set("C1", "6");
  EXPECT_EQ(f.at("D1"), std::string("16"));
  // A refused edit also does not disturb the cell's own earlier precedents.
  f.set("B1", "=C1+1");
  IS(f.set("B1", "=D1+1"), Cycle);
  EXPECT_EQ(f.text("B1"), std::string("=C1+1"));
  f.set("C1", "10");
  EXPECT_EQ(f.at("B1"), std::string("11"));
}

TEST(Cycle, ReplacingAFormulaCanBreakACycleThatWouldHaveFormed) {
  Fixture f;
  f.set("A1", "=B1");
  IS(f.set("B1", "=A1"), Cycle);
  IS(f.set("A1", "7"), Ok);
  IS(f.set("B1", "=A1"), Ok);
  EXPECT_EQ(f.at("B1"), std::string("7"));
  IS(f.set("A1", "=B1"), Cycle);
  IS(f.set("A1", ""), Ok);
  IS(f.set("A1", "=B1+1"), Cycle);
}

namespace {
// An independent model: it keeps the typed formulas as little trees and evaluates by plain recursion.
struct ModelCell {
  int kind = 0;  // 0 empty, 1 literal, 2 binary of two refs/literals
  long long literal = 0;
  int left = -1, right = -1;  // cell numbers
  char op = '+';
};

struct Model {
  std::map<int, ModelCell> cells;
  static const int kCols = 4;

  bool reaches(int from, int target) const {
    if (from == target) return true;
    const auto it = cells.find(from);
    if (it == cells.end() || it->second.kind != 2) return false;
    return reaches(it->second.left, target) || reaches(it->second.right, target);
  }

  Value eval(int cell) const {
    Value v;
    const auto it = cells.find(cell);
    if (it == cells.end()) return v;
    const ModelCell& c = it->second;
    if (c.kind == 1) {
      v.number = c.literal;
      return v;
    }
    const Value l = eval(c.left);
    const Value r = eval(c.right);
    if (l.error != Error::None) return l;
    if (r.error != Error::None) return r;
    if (c.op == '+') v.number = l.number + r.number;
    if (c.op == '-') v.number = l.number - r.number;
    if (c.op == '*') v.number = l.number * r.number;
    if (c.op == '/') {
      if (r.number == 0) v.error = Error::DivideByZero;
      else v.number = l.number / r.number;
    }
    return v;
  }
};

std::string name(int cell) { return std::string(1, static_cast<char>('A' + cell % Model::kCols)) + std::to_string(cell / Model::kCols + 1); }
}  // namespace

TEST(Model, RandomEditsAgreeWithAnIndependentRecursiveModel) {
  for (unsigned seed = 1; seed <= 25; ++seed) {
    std::mt19937 rng(seed);
    Fixture f;
    Model model;
    const int total = Model::kCols * 3;
    for (int step = 0; step < 120; ++step) {
      const int cell = static_cast<int>(rng() % total);
      const int choice = static_cast<int>(rng() % 10);
      std::string text;
      ModelCell next;
      if (choice == 0) {
        next.kind = 0;
      } else if (choice < 4) {
        next.kind = 1;
        next.literal = static_cast<long long>(rng() % 5) - 1;
        text = std::to_string(next.literal);
      } else {
        next.kind = 2;
        next.left = static_cast<int>(rng() % total);
        next.right = static_cast<int>(rng() % total);
        next.op = "+-/"[rng() % 3];  // no "*": chains of products would overflow
        text = "=" + name(next.left) + std::string(1, next.op) + name(next.right);
      }
      const bool cyclic = next.kind == 2 && (model.reaches(next.left, cell) || model.reaches(next.right, cell));
      const Status got = f.set(name(cell), text);
      if (cyclic) {
        EXPECT_TRUE(got == Status::Cycle);
      } else {
        EXPECT_TRUE(got == Status::Ok);
        if (next.kind == 0) model.cells.erase(cell);
        else model.cells[cell] = next;
      }
      for (int c = 0; c < total; ++c) {
        const std::string expected = show(model.eval(c));
        if (f.at(name(c)) != expected) {
          EXPECT_EQ(f.at(name(c)), expected);
          return;
        }
      }
    }
  }
}
