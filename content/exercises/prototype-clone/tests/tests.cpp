#include <memory>
#include <string>
#include "bp_test.h"
#include "solution.h"

TEST(Describe, WidgetsDescribeThemselves) {
  EXPECT_EQ(Label("Name").describe(), std::string("label(Name)"));
  EXPECT_EQ(Badge("new").describe(), std::string("badge(new)"));
  Panel p("form");
  EXPECT_EQ(p.describe(), std::string("panel(form)[]"));
  p.add(std::make_unique<Label>("Name")).add(std::make_unique<Badge>("new"));
  EXPECT_EQ(p.describe(), std::string("panel(form)[label(Name),badge(new)]"));
  EXPECT_EQ(p.size(), static_cast<std::size_t>(2));
  EXPECT_TRUE(p.child(2) == nullptr);
}

TEST(Clone, KeepsTheDynamicType) {
  const Badge b("new");
  const std::unique_ptr<Widget> c = b.clone();
  ASSERT_TRUE(c != nullptr);
  EXPECT_EQ(c->describe(), std::string("badge(new)"));
  const Label l("hi");
  EXPECT_EQ(l.clone()->describe(), std::string("label(hi)"));
}

TEST(Clone, ThroughTheBaseInterface) {
  std::unique_ptr<Widget> w = std::make_unique<Badge>("beta");
  std::unique_ptr<Widget> copy = w->clone();
  EXPECT_TRUE(copy.get() != w.get());
  EXPECT_EQ(copy->describe(), std::string("badge(beta)"));
}

TEST(Clone, EditingACopyLeavesTheOriginalAlone) {
  Label original("a");
  auto copy = original.clone();
  copy->setText("b");
  EXPECT_EQ(original.describe(), std::string("label(a)"));
  EXPECT_EQ(copy->describe(), std::string("label(b)"));
  original.setText("c");
  EXPECT_EQ(copy->describe(), std::string("label(b)"));
}

TEST(Clone, PanelCopiesAreDeep) {
  Panel original("form");
  original.add(std::make_unique<Label>("Name")).add(std::make_unique<Badge>("new"));
  auto copy = original.clone();
  ASSERT_TRUE(copy != nullptr);
  EXPECT_EQ(copy->describe(), original.describe());
  auto& copyPanel = static_cast<Panel&>(*copy);
  ASSERT_TRUE(copyPanel.child(0) != nullptr);
  copyPanel.child(0)->setText("Email");
  copy->setText("signup");
  EXPECT_EQ(original.describe(), std::string("panel(form)[label(Name),badge(new)]"));
  EXPECT_EQ(copy->describe(), std::string("panel(signup)[label(Email),badge(new)]"));
  EXPECT_TRUE(copyPanel.child(0) != original.child(0));
  original.child(1)->setText("old");
  EXPECT_EQ(copy->describe(), std::string("panel(signup)[label(Email),badge(new)]"));
}

TEST(Clone, NestedPanelsAreDeep) {
  Panel outer("outer");
  auto inner = std::make_unique<Panel>("inner");
  inner->add(std::make_unique<Badge>("x"));
  outer.add(std::move(inner));
  auto copy = outer.clone();
  static_cast<Panel*>(static_cast<Panel&>(*copy).child(0))->child(0)->setText("y");
  EXPECT_EQ(outer.describe(), std::string("panel(outer)[panel(inner)[badge(x)]]"));
  EXPECT_EQ(copy->describe(), std::string("panel(outer)[panel(inner)[badge(y)]]"));
}

TEST(Palette, SpawnsIndependentCopies) {
  Panel proto("card");
  proto.add(std::make_unique<Badge>("hot"));
  Palette palette;
  EXPECT_TRUE(palette.add("card", proto));
  auto a = palette.spawn("card");
  auto b = palette.spawn("card");
  ASSERT_TRUE(a != nullptr && b != nullptr);
  EXPECT_TRUE(a.get() != b.get());
  a->setText("changed");
  EXPECT_EQ(b->describe(), std::string("panel(card)[badge(hot)]"));
  EXPECT_EQ(palette.spawn("card")->describe(), std::string("panel(card)[badge(hot)]"));
}

TEST(Palette, KeepsItsOwnSnapshot) {
  Label source("v1");
  Palette palette;
  EXPECT_TRUE(palette.add("title", source));
  source.setText("v2");
  EXPECT_EQ(palette.spawn("title")->describe(), std::string("label(v1)"));
}

TEST(Palette, RejectsBadNamesAndUnknownSpawn) {
  Label a("a");
  Label b("b");
  Palette palette;
  EXPECT_FALSE(palette.add("", a));
  EXPECT_TRUE(palette.add("x", a));
  EXPECT_FALSE(palette.add("x", b));
  EXPECT_EQ(palette.spawn("x")->describe(), std::string("label(a)"));
  EXPECT_TRUE(palette.spawn("nope") == nullptr);
}
