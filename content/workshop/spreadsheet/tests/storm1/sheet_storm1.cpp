#include <memory>
#include <random>
#include <string>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
using sheet::Error;
using sheet::Status;
using sheet::Value;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

std::string show(const Value& v) { return v.error == Error::DivideByZero ? "#DIV/0" : std::to_string(v.number); }

struct Fixture {
  std::unique_ptr<sheet::Sheet> s = sheet::makeFunctionSheet();
  Status set(const std::string& cell, const std::string& text) { return s->set(cell, text); }
  std::string at(const std::string& cell) {
    Value v;
    return s->get(cell, v) == Status::Ok ? show(v) : "<invalid>";
  }
  std::size_t cost(const std::string& cell, const std::string& text) {
    const std::size_t before = s->evaluations();
    s->set(cell, text);
    return s->evaluations() - before;
  }
  // Fills A1..A5 with 4, -2, 9, (empty), 1.
  void column() {
    set("A1", "4");
    set("A2", "-2");
    set("A3", "9");
    set("A5", "1");
  }
};
}  // namespace

TEST(Range, SumMinMaxAndCountOverAColumn) {
  Fixture f;
  f.column();
  f.set("C1", "=SUM(A1:A5)");
  f.set("C2", "=MIN(A1:A5)");
  f.set("C3", "=MAX(A1:A5)");
  f.set("C4", "=COUNT(A1:A5)");
  EXPECT_EQ(f.at("C1"), std::string("12"));
  EXPECT_EQ(f.at("C2"), std::string("-2"));
  EXPECT_EQ(f.at("C3"), std::string("9"));
  EXPECT_EQ(f.at("C4"), std::string("4"));
  f.set("A4", "100");
  EXPECT_EQ(f.at("C1"), std::string("112"));
  EXPECT_EQ(f.at("C3"), std::string("100"));
  EXPECT_EQ(f.at("C4"), std::string("5"));
}

TEST(Range, EmptyCellsCountAsZeroInSumMinAndMaxButNotInCount) {
  Fixture f;
  f.set("A1", "5");
  f.set("A3", "7");
  f.set("B1", "=MIN(A1:A3)");
  f.set("B2", "=MAX(A1:A3)");
  f.set("B3", "=SUM(A1:A3)");
  f.set("B4", "=COUNT(A1:A3)");
  EXPECT_EQ(f.at("B1"), std::string("0"));
  EXPECT_EQ(f.at("B2"), std::string("7"));
  EXPECT_EQ(f.at("B3"), std::string("12"));
  EXPECT_EQ(f.at("B4"), std::string("2"));
  f.set("D1", "=MAX(C1:C3)");
  f.set("C2", "-4");
  EXPECT_EQ(f.at("D1"), std::string("0"));
  f.set("D2", "=MIN(F5:F6)");
  EXPECT_EQ(f.at("D2"), std::string("0"));
  EXPECT_EQ(f.at("D1"), std::string("0"));
  f.set("A2", "0");  // a literal zero is not empty
  EXPECT_EQ(f.at("B4"), std::string("3"));
  f.set("A2", "");
  EXPECT_EQ(f.at("B4"), std::string("2"));
}

TEST(Range, RectanglesInAnyCornerOrderAndSingleCells) {
  Fixture f;
  f.set("A1", "1");
  f.set("B1", "2");
  f.set("A2", "3");
  f.set("B2", "4");
  f.set("C1", "100");
  f.set("D1", "=SUM(A1:B2)");
  f.set("D2", "=SUM(B2:A1)");
  f.set("D3", "=SUM(A2:B1)");
  f.set("D4", "=SUM(B1:A2)");
  f.set("D5", "=SUM(B2:B2)");
  f.set("D6", "=SUM(A1:B1)");
  f.set("D7", "=COUNT(A1:C2)");
  for (const char* c : {"D1", "D2", "D3", "D4"}) EXPECT_EQ(f.at(c), std::string("10"));
  EXPECT_EQ(f.at("D5"), std::string("4"));
  EXPECT_EQ(f.at("D6"), std::string("3"));
  EXPECT_EQ(f.at("D7"), std::string("5"));
}

TEST(Range, FunctionsMixWithArithmeticAndSpaces) {
  Fixture f;
  f.column();
  IS(f.set("B1", "=SUM(A1:A5)*2+MAX(A1:A2)"), Ok);
  EXPECT_EQ(f.at("B1"), std::string("28"));
  IS(f.set("B2", "= - SUM ( A1 : A3 ) / ( 1 + COUNT(A1:A5) ) "), Ok);
  EXPECT_EQ(f.at("B2"), std::string("-2"));
  IS(f.set("B3", "=B1-SUM(A1:A1)"), Ok);
  EXPECT_EQ(f.at("B3"), std::string("24"));
  IS(f.set("B4", "=SUM(A1:A3)+SUM(A1:A3)"), Ok);
  EXPECT_EQ(f.at("B4"), std::string("22"));
}

TEST(Range, EveryCellInTheRangeIsADependencyNotJustTheCorners) {
  Fixture f;
  f.column();
  f.set("C1", "=SUM(A1:A5)");
  EXPECT_EQ(f.cost("A3", "10"), 1u);
  EXPECT_EQ(f.at("C1"), std::string("13"));
  EXPECT_EQ(f.cost("A4", "5"), 1u);  // an empty cell in the middle too
  EXPECT_EQ(f.at("C1"), std::string("18"));
  EXPECT_EQ(f.cost("B3", "5"), 0u);
  EXPECT_EQ(f.cost("A6", "5"), 0u);
  f.set("C2", "=COUNT(A1:B5)");
  EXPECT_EQ(f.cost("B2", "1"), 1u);
  EXPECT_EQ(f.at("C2"), std::string("7"));
  f.set("D1", "=C1+C2");
  EXPECT_EQ(f.cost("A2", "0"), 3u);  // C1, C2 and D1, once each
}

TEST(Range, ErrorsInsideARangeBreakSumMinAndMaxButNotCount) {
  Fixture f;
  f.column();
  f.set("A4", "=1/0");
  f.set("C1", "=SUM(A1:A5)");
  f.set("C2", "=MIN(A1:A5)");
  f.set("C3", "=MAX(A1:A5)");
  f.set("C4", "=COUNT(A1:A5)");
  f.set("C5", "=SUM(A1:A3)");
  EXPECT_EQ(f.at("C1"), std::string("#DIV/0"));
  EXPECT_EQ(f.at("C2"), std::string("#DIV/0"));
  EXPECT_EQ(f.at("C3"), std::string("#DIV/0"));
  EXPECT_EQ(f.at("C4"), std::string("5"));
  EXPECT_EQ(f.at("C5"), std::string("11"));
  f.set("A4", "6");
  EXPECT_EQ(f.at("C1"), std::string("18"));
  EXPECT_EQ(f.at("C4"), std::string("5"));
}

TEST(Range, ACycleThroughTheMiddleOfARangeIsRefused) {
  Fixture f;
  f.set("B1", "=SUM(A1:A5)");
  IS(f.set("A3", "=B1"), Cycle);
  IS(f.set("A3", "=B1+1"), Cycle);
  IS(f.set("A3", "=C1"), Ok);
  IS(f.set("C1", "=B1"), Cycle);
  IS(f.set("B1", "=SUM(A3:A3)"), Ok);   // a range that includes A3 only, which reads C1, which is empty
  IS(f.set("A3", "=SUM(A1:C3)"), Cycle);  // A3 inside its own range
  IS(f.set("A3", "=SUM(A1:A2)"), Ok);
  IS(f.set("A2", "=COUNT(A1:C1)"), Cycle);  // A2 reads B1, which reads A3, which reads A2
  IS(f.set("A2", "=COUNT(C1:C5)"), Ok);
  IS(f.set("B1", "=COUNT(A1:A9)"), Ok);
  EXPECT_EQ(f.at("B1"), std::string("2"));
  IS(f.set("A9", "=B1"), Cycle);
}

TEST(Range, BadFunctionTextIsRefusedAndChangesNothing) {
  Fixture f;
  f.set("A1", "3");
  f.set("B1", "=SUM(A1:A2)");
  for (const char* bad : {"=SUM(A1)", "=SUM(A1:)", "=SUM(:A2)", "=SUM(A1:A2", "=SUM A1:A2", "=SUM(A1:A2:A3)", "=SUM(A1:A100)", "=sum(A1:A2)",
                          "=AVG(A1:A2)", "=SUM(1:2)", "=SUM(A1:A2,B1:B2)", "=SUM()", "=SUM(A1:A2)SUM(A1:A2)", "=SUM(A1:A2)+", "=SUM(A1 A2)", "=SUM(a1:A2)",
                          "=SUMS(A1:A2)", "=SUM1(A1:A2)", "=SUM(A1:A2)(", "=COUNT(A1:2)"}) {
    IS(f.set("C1", bad), InvalidFormula);
  }
  EXPECT_EQ(f.at("C1"), std::string("0"));
  EXPECT_EQ(f.at("B1"), std::string("3"));
  IS(f.set("C1", "=SUM(A1:A2)"), Ok);
  EXPECT_EQ(f.at("C1"), std::string("3"));
}

TEST(Range, ThePlainSheetStillRefusesFunctions) {
  auto plain = sheet::makeSheet();
  IS(plain->set("A1", "=SUM(B1:B2)"), InvalidFormula);
  IS(plain->set("A1", "=1+2"), Ok);
}

TEST(Range, RandomRangesAgreeWithASimpleModel) {
  for (unsigned seed = 1; seed <= 20; ++seed) {
    std::mt19937 rng(seed);
    Fixture f;
    long long grid[4][6] = {};
    bool filled[4][6] = {};
    for (int step = 0; step < 60; ++step) {
      const int c = static_cast<int>(rng() % 4);
      const int r = static_cast<int>(rng() % 6);
      const std::string cell = std::string(1, static_cast<char>('A' + c)) + std::to_string(r + 1);
      if (rng() % 5 == 0) {
        f.set(cell, "");
        grid[c][r] = 0;
        filled[c][r] = false;
      } else {
        grid[c][r] = static_cast<long long>(rng() % 9) - 3;
        filled[c][r] = true;
        f.set(cell, std::to_string(grid[c][r]));
      }
      const int c1 = static_cast<int>(rng() % 4), c2 = static_cast<int>(rng() % 4);
      const int r1 = static_cast<int>(rng() % 6), r2 = static_cast<int>(rng() % 6);
      auto name = [](int col, int row) { return std::string(1, static_cast<char>('A' + col)) + std::to_string(row + 1); };
      // Output cells live in columns H..K so they never overlap the data.
      f.set("H" + std::to_string(step % 50 + 1), "=SUM(" + name(c1, r1) + ":" + name(c2, r2) + ")");
      f.set("I1", "=MIN(" + name(c1, r1) + ":" + name(c2, r2) + ")");
      f.set("J1", "=MAX(" + name(c1, r1) + ":" + name(c2, r2) + ")");
      f.set("K1", "=COUNT(" + name(c1, r1) + ":" + name(c2, r2) + ")");
      long long sum = 0, mn = 1000, mx = -1000, count = 0;
      for (int cc = std::min(c1, c2); cc <= std::max(c1, c2); ++cc) {
        for (int rr = std::min(r1, r2); rr <= std::max(r1, r2); ++rr) {
          sum += grid[cc][rr];
          mn = std::min(mn, grid[cc][rr]);
          mx = std::max(mx, grid[cc][rr]);
          count += filled[cc][rr] ? 1 : 0;
        }
      }
      if (f.at("H" + std::to_string(step % 50 + 1)) != std::to_string(sum) || f.at("I1") != std::to_string(mn) ||
          f.at("J1") != std::to_string(mx) || f.at("K1") != std::to_string(count)) {
        EXPECT_EQ(f.at("I1"), std::to_string(mn));
        EXPECT_EQ(f.at("K1"), std::to_string(count));
        EXPECT_EQ(f.at("J1"), std::to_string(mx));
        EXPECT_EQ(f.at("H" + std::to_string(step % 50 + 1)), std::to_string(sum));
        return;
      }
    }
  }
}
