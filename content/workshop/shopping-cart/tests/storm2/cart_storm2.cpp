#include <memory>
#include <string>

#include "api_storm2.h"
#include "bp_test.h"

using cart::CouponRule;
using cart::CouponStatus;
using Kind = cart::CouponRule::Kind;

namespace {
CouponRule rule(Kind kind, long long value, cart::Money minSubtotal = 0, const std::string& sku = "") {
  CouponRule r;
  r.kind = kind;
  r.value = value;
  r.minSubtotal = minSubtotal;
  r.sku = sku;
  return r;
}

// Products: "pen" 150 (10 on the shelf), "book" 1200 (3), "lamp" 4500 (1).
// Coupons: TEN (10% off, ordinary), WELCOME (10% off, stackable), FIVE (500 off, stackable),
// BOOKS (50% off books, stackable), BIGSPEND (1000 off, stackable, minimum 5000).
struct Fixture {
  std::unique_ptr<cart::StackingShop> shop = cart::makeStackingShop();
  Fixture() {
    shop->addProduct("pen", 150, 10);
    shop->addProduct("book", 1200, 3);
    shop->addProduct("lamp", 4500, 1);
    shop->addCoupon("TEN", rule(Kind::PercentOffCart, 10));
    shop->addStackableCoupon("WELCOME", rule(Kind::PercentOffCart, 10));
    shop->addStackableCoupon("FIVE", rule(Kind::AmountOffCart, 500));
    shop->addStackableCoupon("BOOKS", rule(Kind::PercentOffSku, 50, 0, "book"));
    shop->addStackableCoupon("BIGSPEND", rule(Kind::AmountOffCart, 1000, 5000));
  }
};
}  // namespace

TEST(Stacking, CouponCodesShareOneNamespaceAndAreValidatedTheSameWay) {
  Fixture f;
  EXPECT_FALSE(f.shop->addStackableCoupon("TEN", rule(Kind::PercentOffCart, 5)));
  EXPECT_FALSE(f.shop->addCoupon("FIVE", rule(Kind::PercentOffCart, 5)));
  EXPECT_FALSE(f.shop->addStackableCoupon("", rule(Kind::PercentOffCart, 5)));
  EXPECT_FALSE(f.shop->addStackableCoupon("X", rule(Kind::PercentOffCart, 101)));
  EXPECT_FALSE(f.shop->addStackableCoupon("Y", rule(Kind::PercentOffSku, 10, 0, "nope")));
  EXPECT_TRUE(f.shop->addStackableCoupon("Z", rule(Kind::AmountOffCart, 1)));
}

TEST(Stacking, StackableCouponsApplyInTheOrderTheyWereAttached) {
  Fixture f;
  f.shop->addToCart("ann", "book", 1);  // 1200
  f.shop->applyCoupon("ann", "WELCOME");
  f.shop->applyCoupon("ann", "FIVE");
  EXPECT_EQ(f.shop->total("ann"), 580);  // 1200 -> 1080 -> 580
  f.shop->addToCart("bob", "book", 1);
  f.shop->applyCoupon("bob", "FIVE");
  f.shop->applyCoupon("bob", "WELCOME");
  EXPECT_EQ(f.shop->total("bob"), 630);  // 1200 -> 700 -> 630
}

TEST(Stacking, EachPercentageIsOfWhatTheEarlierOnesLeft) {
  Fixture f;
  f.shop->addStackableCoupon("HALF", rule(Kind::PercentOffCart, 50));
  f.shop->addToCart("ann", "book", 1);
  f.shop->applyCoupon("ann", "HALF");
  f.shop->applyCoupon("ann", "HALF");
  EXPECT_EQ(f.shop->total("ann"), 600);  // attaching the same one twice changes nothing
  f.shop->applyCoupon("ann", "WELCOME");
  EXPECT_EQ(f.shop->total("ann"), 540);  // 1200 -> 600 -> 540
}

TEST(Stacking, ReapplyingAStackableCouponKeepsItsPlace) {
  Fixture f;
  f.shop->addToCart("ann", "book", 1);
  f.shop->applyCoupon("ann", "WELCOME");
  f.shop->applyCoupon("ann", "FIVE");
  f.shop->applyCoupon("ann", "WELCOME");  // already first: must not move to the end
  EXPECT_EQ(f.shop->total("ann"), 580);
}

TEST(Stacking, AnOrdinaryCouponReplacesEverything) {
  Fixture f;
  f.shop->addToCart("ann", "book", 1);
  f.shop->applyCoupon("ann", "WELCOME");
  f.shop->applyCoupon("ann", "FIVE");
  f.shop->applyCoupon("ann", "TEN");
  EXPECT_EQ(f.shop->total("ann"), 1080);
}

TEST(Stacking, AStackableCouponPushesOutAnOrdinaryOneButJoinsStackables) {
  Fixture f;
  f.shop->addToCart("ann", "book", 1);
  f.shop->applyCoupon("ann", "TEN");
  f.shop->applyCoupon("ann", "FIVE");
  EXPECT_EQ(f.shop->total("ann"), 700);  // TEN is gone
  f.shop->applyCoupon("ann", "WELCOME");
  EXPECT_EQ(f.shop->total("ann"), 630);  // FIVE then WELCOME
}

TEST(Stacking, ASkuCouponTakesItsPercentOfTheLineButNeverMoreThanIsLeft) {
  Fixture f;
  f.shop->addToCart("ann", "book", 2);  // 2400
  f.shop->addToCart("ann", "pen", 1);   // 150
  f.shop->applyCoupon("ann", "BOOKS");  // 1200 off the line
  EXPECT_EQ(f.shop->total("ann"), 1350);
  f.shop->addStackableCoupon("ALMOST", rule(Kind::AmountOffCart, 1300));
  f.shop->applyCoupon("ann", "ALMOST");  // leaves 50
  EXPECT_EQ(f.shop->total("ann"), 50);
  f.shop->addStackableCoupon("ALLBOOKS", rule(Kind::PercentOffSku, 100, 0, "book"));
  f.shop->applyCoupon("ann", "ALLBOOKS");  // 2400 of line, but only 50 left
  EXPECT_EQ(f.shop->total("ann"), 0);
}

TEST(Stacking, EligibilityLooksAtTheSubtotalBeforeAnyCoupon) {
  Fixture f;
  f.shop->addToCart("ann", "lamp", 1);  // 4500
  f.shop->addToCart("ann", "pen", 4);   // 600: subtotal 5100
  f.shop->applyCoupon("ann", "FIVE");
  f.shop->applyCoupon("ann", "BIGSPEND");  // FIVE leaves 4600, but the subtotal 5100 is what counts
  EXPECT_EQ(f.shop->total("ann"), 3600);
  f.shop->removeFromCart("ann", "pen", 4);  // subtotal 4500 < 5000: BIGSPEND gives nothing
  EXPECT_EQ(f.shop->total("ann"), 4000);
}

TEST(Stacking, CheckoutChargesTheStackAndUsesAllOfItUp) {
  Fixture f;
  f.shop->addToCart("ann", "book", 2);
  f.shop->applyCoupon("ann", "WELCOME");
  f.shop->applyCoupon("ann", "FIVE");
  const cart::Money quoted = f.shop->total("ann");
  const cart::CheckoutResult r = f.shop->checkout("ann");
  EXPECT_EQ(r.total, quoted);
  EXPECT_EQ(r.total, 1660);  // 2400 -> 2160 -> 1660
  f.shop->addToCart("ann", "pen", 1);
  EXPECT_EQ(f.shop->total("ann"), 150);
}

TEST(Stacking, ClearingRemovesTheWholeStack) {
  Fixture f;
  f.shop->addToCart("ann", "book", 1);
  f.shop->applyCoupon("ann", "WELCOME");
  f.shop->applyCoupon("ann", "FIVE");
  f.shop->clearCoupons("ann");
  EXPECT_EQ(f.shop->total("ann"), 1200);
  f.shop->applyCoupon("ann", "FIVE");
  EXPECT_EQ(f.shop->total("ann"), 700);
}
