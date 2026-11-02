#include <memory>
#include "bp_test.h"
#include "solution.h"

namespace {
// A rule the solution has never seen: first unit full price, the rest half price.
class SecondHalfPrice : public PricingStrategy {
 public:
  long long price(long long unitCents, int quantity) const override {
    if (quantity <= 0) return 0;
    return unitCents + (unitCents / 2) * (quantity - 1);
  }
};
}  // namespace

TEST(Regular, MultipliesUnitPrice) {
  RegularPrice r;
  EXPECT_EQ(r.price(250, 4), 1000LL);
  EXPECT_EQ(r.price(250, 0), 0LL);
}

TEST(Bulk, DiscountAtAndAboveThreshold) {
  BulkDiscount b(10, 20);
  EXPECT_EQ(b.price(100, 10), 800LL);
  EXPECT_EQ(b.price(100, 20), 1600LL);
}

TEST(Bulk, NoDiscountBelowThreshold) {
  BulkDiscount b(10, 20);
  EXPECT_EQ(b.price(100, 9), 900LL);
}

TEST(Bulk, DiscountTruncatesInTheShopsFavour) {
  BulkDiscount b(3, 10);
  EXPECT_EQ(b.price(999, 3), 2997LL - 299LL);  // 2997 * 10 / 100 = 299 (truncated)
}

TEST(Bulk, LargeAmountsDoNotOverflow) {
  BulkDiscount b(1, 50);
  EXPECT_EQ(b.price(3000000000LL, 2), 3000000000LL);
}

TEST(Checkout, UsesTheGivenStrategy) {
  Checkout c(std::make_unique<BulkDiscount>(5, 10));
  EXPECT_EQ(c.total(200, 5), 900LL);
  EXPECT_EQ(c.total(200, 4), 800LL);
}

TEST(Checkout, NullStrategyFallsBackToRegular) {
  Checkout c(nullptr);
  EXPECT_EQ(c.total(120, 3), 360LL);
  c.setStrategy(std::make_unique<BulkDiscount>(1, 50));
  c.setStrategy(nullptr);
  EXPECT_EQ(c.total(120, 3), 360LL);
}

TEST(Open, CheckoutAcceptsAStrategyItHasNeverSeen) {
  Checkout c(std::make_unique<SecondHalfPrice>());
  EXPECT_EQ(c.total(100, 3), 200LL);
}

TEST(Open, SwitchingStrategyChangesTotals) {
  Checkout c(std::make_unique<RegularPrice>());
  EXPECT_EQ(c.total(100, 3), 300LL);
  c.setStrategy(std::make_unique<SecondHalfPrice>());
  EXPECT_EQ(c.total(100, 3), 200LL);
  c.setStrategy(std::make_unique<BulkDiscount>(3, 10));
  EXPECT_EQ(c.total(100, 3), 270LL);
}
