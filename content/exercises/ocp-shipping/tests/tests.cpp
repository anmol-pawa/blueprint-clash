#include <memory>
#include <string>
#include "bp_test.h"
#include "solution.h"

namespace {
int liveRules = 0;

struct Flat : ShippingRule {  // a carrier the solution has never seen
  std::string where;
  long long price;
  Flat(std::string c, long long p) : where(std::move(c)), price(p) { ++liveRules; }
  ~Flat() override { --liveRules; }
  bool matches(const Parcel& p) const override { return p.country == where; }
  long long cents(const Parcel&) const override { return price; }
};
struct PerKilo : ShippingRule {  // price depends on weight
  bool matches(const Parcel& p) const override { return p.grams > 0; }
  long long cents(const Parcel& p) const override { return 100 + 200LL * ((p.grams + 999) / 1000); }
};
}  // namespace

TEST(Quote, NoMatchingRuleIsMinusOne) {
  ShippingCalculator calc;
  EXPECT_EQ(calc.quote(Parcel{500, "FR"}), -1LL);
  calc.add(std::make_unique<Flat>("US", 700));
  EXPECT_EQ(calc.quote(Parcel{500, "FR"}), -1LL);
}

TEST(Quote, UsesRegisteredRules) {
  ShippingCalculator calc;
  calc.add(std::make_unique<Flat>("DE", 900));
  calc.add(std::make_unique<Flat>("JP", 1500));
  EXPECT_EQ(calc.quote(Parcel{100, "DE"}), 900LL);
  EXPECT_EQ(calc.quote(Parcel{100, "JP"}), 1500LL);
  EXPECT_EQ(calc.ruleCount(), static_cast<std::size_t>(2));
}

TEST(Quote, PicksTheCheapestMatchingRule) {
  ShippingCalculator calc;
  calc.add(std::make_unique<Flat>("US", 800));
  calc.add(std::make_unique<PerKilo>());  // 1500 g -> 100 + 2*200 = 500
  calc.add(std::make_unique<Flat>("US", 650));
  EXPECT_EQ(calc.quote(Parcel{1500, "US"}), 500LL);
  EXPECT_EQ(calc.quote(Parcel{3000, "US"}), 650LL);  // PerKilo is now 700
}

TEST(Quote, WeightRuleSeesTheParcel) {
  ShippingCalculator calc;
  calc.add(std::make_unique<PerKilo>());
  EXPECT_EQ(calc.quote(Parcel{1, "ZZ"}), 300LL);
  EXPECT_EQ(calc.quote(Parcel{1001, "ZZ"}), 500LL);
  EXPECT_EQ(calc.quote(Parcel{0, "ZZ"}), -1LL);
}

TEST(Ownership, NullRuleIsIgnored) {
  ShippingCalculator calc;
  calc.add(nullptr);
  EXPECT_EQ(calc.ruleCount(), static_cast<std::size_t>(0));
  EXPECT_EQ(calc.quote(Parcel{10, "US"}), -1LL);
}

TEST(Ownership, CalculatorDestroysItsRules) {
  EXPECT_EQ(liveRules, 0);
  {
    ShippingCalculator calc;
    calc.add(std::make_unique<Flat>("A", 1));
    calc.add(std::make_unique<Flat>("B", 2));
    EXPECT_EQ(liveRules, 2);
  }
  EXPECT_EQ(liveRules, 0);
}
