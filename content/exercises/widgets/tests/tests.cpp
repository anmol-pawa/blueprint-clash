#include <memory>
#include <utility>
#include "bp_test.h"
#include "solution.h"

namespace {
Panel sample() {
  Panel p;
  p.add(std::make_unique<Label>("title"));
  p.add(std::make_unique<Button>("ok"));
  return p;
}
}  // namespace

TEST(Basics, AddAndAccess) {
  Panel p = sample();
  EXPECT_EQ(p.size(), 2u);
  EXPECT_EQ(p.at(0)->kind(), std::string("label"));
  EXPECT_EQ(p.at(1)->text(), std::string("ok"));
}

TEST(Basics, NullIsIgnored) {
  Panel p;
  p.add(nullptr);
  EXPECT_EQ(p.size(), 0u);
}

TEST(Copy, KeepsDynamicTypes) {
  Panel a = sample();
  Panel b(a);
  EXPECT_EQ(b.size(), 2u);
  EXPECT_EQ(b.at(0)->kind(), std::string("label"));
  EXPECT_EQ(b.at(1)->kind(), std::string("button"));
  EXPECT_EQ(b.at(1)->text(), std::string("ok"));
}

TEST(Copy, CopyIsIndependent) {
  Panel a = sample();
  Panel b(a);
  b.at(1)->setText("changed");
  EXPECT_EQ(a.at(1)->text(), std::string("ok"));
  EXPECT_EQ(b.at(1)->text(), std::string("changed"));
}

TEST(Copy, AssignmentIsIndependent) {
  Panel a = sample();
  Panel b;
  b = a;
  b.at(0)->setText("other");
  EXPECT_EQ(a.at(0)->text(), std::string("title"));
}

TEST(Copy, AssignmentReplacesContents) {
  Panel a = sample();
  Panel b = sample();
  b.add(std::make_unique<Label>("extra"));
  b = a;
  EXPECT_EQ(b.size(), 2u);
}

TEST(Copy, SelfAssignmentIsHarmless) {
  Panel a = sample();
  Panel& alias = a;
  a = alias;
  EXPECT_EQ(a.size(), 2u);
  EXPECT_EQ(a.at(0)->text(), std::string("title"));
}

TEST(Ownership, NoLeaksAcrossCopyMoveAndDestroy) {
  int before = Widget::live();
  {
    Panel a = sample();
    Panel b(a);
    Panel c;
    c = b;
    Panel d(std::move(a));
    EXPECT_EQ(d.size(), 2u);
    EXPECT_EQ(Widget::live(), before + 6);
  }
  EXPECT_EQ(Widget::live(), before);
}
