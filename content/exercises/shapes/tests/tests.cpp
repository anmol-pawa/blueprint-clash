#include <cmath>
#include <memory>
#include <type_traits>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
int gProbeAlive = 0;
struct Probe : Shape {
  Probe() { ++gProbeAlive; }
  ~Probe() { --gProbeAlive; }
  double area() const override { return 7.0; }
  std::string name() const override { return "probe"; }
};
bool near(double a, double b) { return std::fabs(a - b) < 1e-6; }
}  // namespace

TEST(Interface, ShapeIsAbstract) { EXPECT_TRUE(std::is_abstract<Shape>::value); }

TEST(Interface, DestructorIsVirtual) { EXPECT_TRUE(std::has_virtual_destructor<Shape>::value); }

TEST(Area, Circle) {
  Circle c(2.0);
  EXPECT_TRUE(near(c.area(), 3.14159265358979 * 4.0));
  Circle unit(1.0);
  EXPECT_TRUE(near(unit.area(), 3.14159265358979));
}

TEST(Area, Rectangle) {
  Rectangle r(3.0, 4.5);
  EXPECT_TRUE(near(r.area(), 13.5));
}

TEST(Names, EachShapeNamesItself) {
  std::vector<std::unique_ptr<Shape>> shapes;
  shapes.push_back(std::make_unique<Circle>(1.0));
  shapes.push_back(std::make_unique<Rectangle>(1.0, 2.0));
  EXPECT_EQ(shapes[0]->name(), std::string("circle"));
  EXPECT_EQ(shapes[1]->name(), std::string("rectangle"));
}

TEST(Polymorphism, TotalAreaThroughBasePointers) {
  std::vector<std::unique_ptr<Shape>> shapes;
  shapes.push_back(std::make_unique<Rectangle>(2.0, 3.0));
  shapes.push_back(std::make_unique<Probe>());
  double total = 0;
  for (const auto& s : shapes) total += s->area();
  EXPECT_TRUE(near(total, 13.0));
}

TEST(Lifetime, DerivedDestructorRunsThroughBase) {
  EXPECT_EQ(gProbeAlive, 0);
  {
    std::unique_ptr<Shape> s = std::make_unique<Probe>();
    EXPECT_EQ(gProbeAlive, 1);
  }
  EXPECT_EQ(gProbeAlive, 0);
}
