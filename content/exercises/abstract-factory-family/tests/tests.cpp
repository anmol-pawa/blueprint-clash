#include <memory>
#include <string>
#include "bp_test.h"
#include "solution.h"

namespace {
// A family the solution has never seen.
class ContrastButton : public Button {
 public:
  std::string family() const override { return "contrast"; }
  std::string render(const std::string& l) const override { return "#" + l + "#"; }
};
class ContrastCheckbox : public Checkbox {
 public:
  std::string family() const override { return "contrast"; }
  std::string render(const std::string& l, bool c) const override { return std::string(c ? "#X# " : "#_# ") + l; }
};
class ContrastFactory : public WidgetFactory {
 public:
  std::unique_ptr<Button> createButton() const override { return std::make_unique<ContrastButton>(); }
  std::unique_ptr<Checkbox> createCheckbox() const override { return std::make_unique<ContrastCheckbox>(); }
};
}  // namespace

TEST(Family, LightRendersLightWidgets) {
  const auto f = makeFactory("light");
  ASSERT_TRUE(f != nullptr);
  EXPECT_EQ(f->createButton()->render("Sign in"), std::string("[Sign in]"));
  EXPECT_EQ(f->createCheckbox()->render("Remember me", true), std::string("[x] Remember me"));
  EXPECT_EQ(f->createCheckbox()->render("Remember me", false), std::string("[ ] Remember me"));
}

TEST(Family, DarkRendersDarkWidgets) {
  const auto f = makeFactory("dark");
  ASSERT_TRUE(f != nullptr);
  EXPECT_EQ(f->createButton()->render("Sign in"), std::string("<Sign in>"));
  EXPECT_EQ(f->createCheckbox()->render("Remember me", true), std::string("(x) Remember me"));
  EXPECT_EQ(f->createCheckbox()->render("Remember me", false), std::string("( ) Remember me"));
}

TEST(Family, ProductsOfOneFactoryShareItsFamily) {
  for (const char* name : {"light", "dark"}) {
    const auto f = makeFactory(name);
    ASSERT_TRUE(f != nullptr);
    const auto b = f->createButton();
    const auto c = f->createCheckbox();
    ASSERT_TRUE(b != nullptr && c != nullptr);
    EXPECT_EQ(b->family(), std::string(name));
    EXPECT_EQ(c->family(), std::string(name));
  }
}

TEST(Family, UnknownFamilyIsNull) {
  EXPECT_TRUE(makeFactory("") == nullptr);
  EXPECT_TRUE(makeFactory("sepia") == nullptr);
  EXPECT_TRUE(makeFactory("Light") == nullptr);
}

TEST(Family, EveryCreateCallMakesANewObject) {
  const auto f = makeFactory("dark");
  ASSERT_TRUE(f != nullptr);
  const auto a = f->createButton();
  const auto b = f->createButton();
  ASSERT_TRUE(a != nullptr && b != nullptr);
  EXPECT_TRUE(a.get() != b.get());
}

TEST(Screen, LoginUsesTheFactoryItIsGiven) {
  EXPECT_EQ(renderLogin(*makeFactory("light")), std::string("[x] Remember me\n[Sign in]"));
  EXPECT_EQ(renderLogin(*makeFactory("dark")), std::string("(x) Remember me\n<Sign in>"));
}

TEST(Screen, WorksWithAFamilyItHasNeverSeen) {
  ContrastFactory contrast;
  EXPECT_EQ(renderLogin(contrast), std::string("#X# Remember me\n#Sign in#"));
}
