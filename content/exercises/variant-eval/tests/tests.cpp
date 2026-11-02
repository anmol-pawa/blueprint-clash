#include <cmath>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
bool near(double a, double b) { return std::fabs(a - b) < 1e-6; }
}  // namespace

TEST(Area, Circle) { EXPECT_TRUE(near(area(Shape{Circle{2.0}}), 3.14159265358979 * 4.0)); }

TEST(Area, Rect) { EXPECT_TRUE(near(area(Shape{Rect{3.0, 4.0}}), 12.0)); }

TEST(Area, Triangle) { EXPECT_TRUE(near(area(Shape{Tri{6.0, 5.0}}), 15.0)); }

TEST(Label, Circle) { EXPECT_EQ(label(Shape{Circle{1.0}}), std::string("circle")); }

TEST(Label, Rect) { EXPECT_EQ(label(Shape{Rect{1.0, 1.0}}), std::string("rect")); }

TEST(Label, Triangle) { EXPECT_EQ(label(Shape{Tri{1.0, 1.0}}), std::string("tri")); }

TEST(Total, SumsAllShapes) {
  std::vector<Shape> v{Rect{2.0, 3.0}, Tri{4.0, 5.0}, Rect{1.0, 1.0}};
  EXPECT_TRUE(near(totalArea(v), 6.0 + 10.0 + 1.0));
}

TEST(Total, SingleShape) {
  std::vector<Shape> v{Rect{2.0, 3.0}};
  EXPECT_TRUE(near(totalArea(v), 6.0));
}

TEST(Total, EmptyIsZero) { EXPECT_TRUE(near(totalArea({}), 0.0)); }
