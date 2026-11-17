#pragma once
// Change Storm 2 adds stackable coupons. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace cart {

class StackingShop : public CouponShop {
 public:
  // Like addCoupon, but the coupon can be combined with other stackable coupons. Codes of both kinds share one
  // namespace. Same validation and return value.
  virtual bool addStackableCoupon(const std::string& code, const CouponRule& rule) = 0;

  // applyCoupon now works like this. Applying an ordinary coupon replaces everything the cart carries (so behaviour
  // with ordinary coupons is exactly as before). Applying a stackable coupon drops any ordinary coupon the cart carries
  // and adds the stackable one after the stackable ones already there; applying one that is already attached changes
  // nothing, its place included.
  //
  // total() takes the attached coupons in the order they were attached. Each works on what the earlier ones left:
  // percentages are of the running amount, an amount never takes more than is left, a percent-off-sku takes its percent
  // of the line's own total (before any coupon) but never more than is left. Whether a coupon is eligible is decided
  // against the subtotal before any coupon, as in Storm 1.
};

std::unique_ptr<StackingShop> makeStackingShop();

}  // namespace cart
