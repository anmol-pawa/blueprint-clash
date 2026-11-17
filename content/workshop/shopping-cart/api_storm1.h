#pragma once
// Change Storm 1 adds coupons. Everything from api.h still holds.
#include "api.h"

namespace cart {

struct CouponRule {
  enum class Kind {
    PercentOffCart,  // `value` percent off what is left of the cart total
    AmountOffCart,   // `value` cents off the cart total
    PercentOffSku,   // `value` percent off the line of product `sku`
  };
  Kind kind = Kind::PercentOffCart;
  long long value = 0;
  Money minSubtotal = 0;  // the coupon only works while the cart subtotal (before any coupon) is at least this
  std::string sku;        // used by PercentOffSku only
};

enum class CouponStatus {
  Ok,
  InvalidRequest,  // empty customer
  UnknownCoupon,   // no coupon with that code
};

class CouponShop : public Shop {
 public:
  // Registers a coupon. Returns false, changing nothing, for an empty or taken code, a negative minSubtotal, a percent
  // outside 1..100, an amount outside 1..kMaxPrice, or a PercentOffSku whose sku is not a product.
  virtual bool addCoupon(const std::string& code, const CouponRule& rule) = 0;

  // Attaches a coupon to the customer's cart. A cart carries at most one coupon: applying another replaces it. Checks,
  // in order: InvalidRequest, UnknownCoupon. Whether the coupon is allowed to work is NOT checked here but each time the
  // cart is priced, so a coupon that stops being eligible stays attached and simply gives nothing (until the cart
  // changes again). The cart need not exist yet.
  virtual CouponStatus applyCoupon(const std::string& customer, const std::string& code) = 0;

  // Detaches whatever coupons the cart carries. Does nothing if there are none.
  virtual void clearCoupons(const std::string& customer) = 0;

  // What checkout() would charge right now: the subtotal minus the reduction of the attached coupon, never below 0.
  // Percentages are taken of the amount they apply to and rounded down. 0 for an empty or unknown cart. checkout()
  // charges exactly this, and a successful checkout uses the coupon up: the cart carries none afterwards.
  virtual Money total(const std::string& customer) const = 0;
};

std::unique_ptr<CouponShop> makeCouponShop();

}  // namespace cart
