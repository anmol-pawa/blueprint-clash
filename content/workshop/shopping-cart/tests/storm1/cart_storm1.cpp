#include <memory>
#include <string>

#include "api_storm1.h"
#include "bp_test.h"

using cart::CouponRule;
using cart::CouponStatus;
using cart::Status;
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
struct Fixture {
  std::unique_ptr<cart::CouponShop> shop = cart::makeCouponShop();
  Fixture() {
    shop->addProduct("pen", 150, 10);
    shop->addProduct("book", 1200, 3);
    shop->addProduct("lamp", 4500, 1);
  }
};
}  // namespace

TEST(CouponSetup, CouponsMustBeNewAndValid) {
  Fixture f;
  EXPECT_TRUE(f.shop->addCoupon("TEN", rule(Kind::PercentOffCart, 10)));
  EXPECT_FALSE(f.shop->addCoupon("TEN", rule(Kind::PercentOffCart, 20)));
  EXPECT_FALSE(f.shop->addCoupon("", rule(Kind::PercentOffCart, 10)));
  EXPECT_FALSE(f.shop->addCoupon("A", rule(Kind::PercentOffCart, 0)));
  EXPECT_FALSE(f.shop->addCoupon("B", rule(Kind::PercentOffCart, 101)));
  EXPECT_TRUE(f.shop->addCoupon("C", rule(Kind::PercentOffCart, 100)));
  EXPECT_FALSE(f.shop->addCoupon("D", rule(Kind::AmountOffCart, 0)));
  EXPECT_FALSE(f.shop->addCoupon("E", rule(Kind::AmountOffCart, 1000001)));
  EXPECT_TRUE(f.shop->addCoupon("F", rule(Kind::AmountOffCart, 1000000)));
  EXPECT_FALSE(f.shop->addCoupon("G", rule(Kind::PercentOffCart, 10, -1)));
  EXPECT_FALSE(f.shop->addCoupon("H", rule(Kind::PercentOffSku, 10, 0, "nope")));
  EXPECT_FALSE(f.shop->addCoupon("I", rule(Kind::PercentOffSku, 0, 0, "pen")));
  EXPECT_TRUE(f.shop->addCoupon("J", rule(Kind::PercentOffSku, 10, 0, "pen")));
}

TEST(CouponSetup, ApplyChecksAreInOrderAndTheCartNeedNotExist) {
  Fixture f;
  f.shop->addCoupon("TEN", rule(Kind::PercentOffCart, 10));
  EXPECT_TRUE(f.shop->applyCoupon("", "nope") == CouponStatus::InvalidRequest);
  EXPECT_TRUE(f.shop->applyCoupon("ann", "nope") == CouponStatus::UnknownCoupon);
  EXPECT_TRUE(f.shop->applyCoupon("ann", "TEN") == CouponStatus::Ok);
  f.shop->addToCart("ann", "book", 1);
  EXPECT_EQ(f.shop->total("ann"), 1080);
}

TEST(Coupon, WithNoCouponTheTotalIsTheSubtotal) {
  Fixture f;
  f.shop->addToCart("ann", "pen", 2);
  EXPECT_EQ(f.shop->total("ann"), 300);
  EXPECT_EQ(f.shop->total("nobody"), 0);
}

TEST(Coupon, PercentOffTheCartRoundsDown) {
  Fixture f;
  f.shop->addCoupon("TEN", rule(Kind::PercentOffCart, 10));
  f.shop->addToCart("ann", "pen", 3);  // 450 -> 45 off
  f.shop->applyCoupon("ann", "TEN");
  EXPECT_EQ(f.shop->total("ann"), 405);
  f.shop->addToCart("ann", "pen", 1);  // 600 -> 60 off
  EXPECT_EQ(f.shop->total("ann"), 540);
  f.shop->addCoupon("THIRD", rule(Kind::PercentOffCart, 33));
  f.shop->addToCart("bob", "pen", 1);  // 150 -> 49.5 -> 49 off
  f.shop->applyCoupon("bob", "THIRD");
  EXPECT_EQ(f.shop->total("bob"), 101);
}

TEST(Coupon, AmountOffNeverGoesBelowZero) {
  Fixture f;
  f.shop->addCoupon("FIVE", rule(Kind::AmountOffCart, 500));
  f.shop->addCoupon("HUGE", rule(Kind::AmountOffCart, 100000));
  f.shop->addToCart("ann", "book", 1);
  f.shop->applyCoupon("ann", "FIVE");
  EXPECT_EQ(f.shop->total("ann"), 700);
  f.shop->applyCoupon("ann", "HUGE");
  EXPECT_EQ(f.shop->total("ann"), 0);
  f.shop->addCoupon("ALL", rule(Kind::PercentOffCart, 100));
  f.shop->applyCoupon("ann", "ALL");
  EXPECT_EQ(f.shop->total("ann"), 0);
}

TEST(Coupon, PercentOffASkuOnlyTouchesThatLine) {
  Fixture f;
  f.shop->addCoupon("PENS", rule(Kind::PercentOffSku, 50, 0, "pen"));
  f.shop->addToCart("ann", "pen", 4);   // 600 -> 300 off
  f.shop->addToCart("ann", "book", 1);  // 1200 untouched
  f.shop->applyCoupon("ann", "PENS");
  EXPECT_EQ(f.shop->total("ann"), 1500);
  f.shop->addToCart("bob", "book", 2);  // no pens in the cart
  f.shop->applyCoupon("bob", "PENS");
  EXPECT_EQ(f.shop->total("bob"), 2400);
}

TEST(Coupon, TheMinimumSubtotalIsInclusiveAndLooksAtTheSubtotalBeforeTheCoupon) {
  Fixture f;
  f.shop->addCoupon("BIG", rule(Kind::AmountOffCart, 200, 1500));
  f.shop->addToCart("ann", "book", 1);
  f.shop->addToCart("ann", "pen", 2);  // 1500 exactly
  f.shop->applyCoupon("ann", "BIG");
  EXPECT_EQ(f.shop->total("ann"), 1300);
  f.shop->removeFromCart("ann", "pen", 1);  // 1350 < 1500: the coupon stays attached but gives nothing
  EXPECT_EQ(f.shop->total("ann"), 1350);
  f.shop->addToCart("ann", "pen", 1);  // eligible again
  EXPECT_EQ(f.shop->total("ann"), 1300);
}

TEST(Coupon, TheMinimumAppliesToSkuCouponsToo) {
  Fixture f;
  f.shop->addCoupon("PENS", rule(Kind::PercentOffSku, 100, 1000, "pen"));
  f.shop->addToCart("ann", "pen", 2);
  f.shop->applyCoupon("ann", "PENS");
  EXPECT_EQ(f.shop->total("ann"), 300);
  f.shop->addToCart("ann", "book", 1);
  EXPECT_EQ(f.shop->total("ann"), 1200);
}

TEST(Coupon, ApplyingAnotherCouponReplacesTheFirstAndClearRemovesIt) {
  Fixture f;
  f.shop->addCoupon("TEN", rule(Kind::PercentOffCart, 10));
  f.shop->addCoupon("FIVE", rule(Kind::AmountOffCart, 500));
  f.shop->addToCart("ann", "book", 1);
  f.shop->applyCoupon("ann", "TEN");
  f.shop->applyCoupon("ann", "FIVE");
  EXPECT_EQ(f.shop->total("ann"), 700);
  f.shop->clearCoupons("ann");
  EXPECT_EQ(f.shop->total("ann"), 1200);
  f.shop->clearCoupons("ann");
  f.shop->clearCoupons("nobody");
  EXPECT_EQ(f.shop->total("ann"), 1200);
}

TEST(Coupon, CouponsBelongToACartNotToTheShop) {
  Fixture f;
  f.shop->addCoupon("TEN", rule(Kind::PercentOffCart, 10));
  f.shop->addToCart("ann", "book", 1);
  f.shop->addToCart("bob", "book", 1);
  f.shop->applyCoupon("ann", "TEN");
  EXPECT_EQ(f.shop->total("ann"), 1080);
  EXPECT_EQ(f.shop->total("bob"), 1200);
}

TEST(CouponCheckout, ChargesTheDiscountedTotalAndTheCouponIsUsedUp) {
  Fixture f;
  f.shop->addCoupon("TEN", rule(Kind::PercentOffCart, 10));
  f.shop->addToCart("ann", "book", 2);
  f.shop->applyCoupon("ann", "TEN");
  const cart::CheckoutResult r = f.shop->checkout("ann");
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.total, 2160);
  f.shop->addToCart("ann", "pen", 2);
  EXPECT_EQ(f.shop->total("ann"), 300);  // the next cart starts without a coupon
}

TEST(CouponCheckout, AFailedCheckoutKeepsTheCoupon) {
  Fixture f;
  f.shop->addCoupon("TEN", rule(Kind::PercentOffCart, 10));
  f.shop->addToCart("ann", "lamp", 2);
  f.shop->applyCoupon("ann", "TEN");
  EXPECT_TRUE(f.shop->checkout("ann").status == Status::OutOfStock);
  EXPECT_EQ(f.shop->total("ann"), 8100);
  f.shop->removeFromCart("ann", "lamp", 1);
  EXPECT_EQ(f.shop->checkout("ann").total, 4050);
}

TEST(CouponCheckout, TheQuotedTotalIsWhatCheckoutCharges) {
  Fixture f;
  f.shop->addCoupon("PENS", rule(Kind::PercentOffSku, 33, 0, "pen"));
  f.shop->addToCart("ann", "pen", 7);
  f.shop->addToCart("ann", "book", 1);
  f.shop->applyCoupon("ann", "PENS");
  const cart::Money quoted = f.shop->total("ann");
  EXPECT_EQ(f.shop->checkout("ann").total, quoted);
}

TEST(CouponCheckout, CancellingAnOrderDoesNotGiveTheCouponBack) {
  Fixture f;
  f.shop->addCoupon("TEN", rule(Kind::PercentOffCart, 10));
  f.shop->addToCart("ann", "book", 1);
  f.shop->applyCoupon("ann", "TEN");
  const cart::OrderId id = f.shop->checkout("ann").id;
  f.shop->cancelOrder(id, "ann");
  f.shop->addToCart("ann", "book", 1);
  EXPECT_EQ(f.shop->total("ann"), 1200);
}
