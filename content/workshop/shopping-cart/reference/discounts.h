#pragma once
#include <algorithm>
#include <map>
#include <memory>
#include <string>
#include <utility>

#include "basket.h"
#include "catalog.h"

// One way a coupon takes money off. `running` is what is left to pay after earlier coupons; a discount never takes
// more than that. Open for new kinds of discount (a new subclass); nothing that uses a Discount changes.
class Discount {
 public:
  virtual ~Discount() = default;
  virtual cart::Money reduction(const Basket& basket, cart::Money running) const = 0;
};

class PercentOffCart : public Discount {
 public:
  explicit PercentOffCart(long long percent) : percent_(percent) {}
  cart::Money reduction(const Basket&, cart::Money running) const override { return running * percent_ / 100; }

 private:
  long long percent_;
};

class AmountOffCart : public Discount {
 public:
  explicit AmountOffCart(cart::Money amount) : amount_(amount) {}
  cart::Money reduction(const Basket&, cart::Money running) const override { return std::min(amount_, running); }

 private:
  cart::Money amount_;
};

class PercentOffSku : public Discount {
 public:
  PercentOffSku(std::string sku, long long percent) : sku_(std::move(sku)), percent_(percent) {}
  cart::Money reduction(const Basket& basket, cart::Money running) const override {
    const auto line = basket.lineTotals.find(sku_);
    if (line == basket.lineTotals.end()) return 0;
    return std::min(line->second * percent_ / 100, running);
  }

 private:
  std::string sku_;
  long long percent_;
};

// A Decorator that adds the eligibility rule "the cart subtotal is at least X" to any other discount. The rule is
// written once here instead of inside every kind of discount.
class MinimumSpend : public Discount {
 public:
  MinimumSpend(std::unique_ptr<Discount> inner, cart::Money minimum) : inner_(std::move(inner)), minimum_(minimum) {}
  cart::Money reduction(const Basket& basket, cart::Money running) const override {
    if (basket.subtotal < minimum_) return 0;
    return inner_->reduction(basket, running);
  }

 private:
  std::unique_ptr<Discount> inner_;
  cart::Money minimum_;
};

// One row per kind of coupon: how to build its discount from a rule, or nullptr when the rule is not valid for it. A
// new kind of coupon is a new Discount subclass plus one row here; nothing that prices a cart changes.
using DiscountBuilder = std::unique_ptr<Discount> (*)(const cart::CouponRule&, const Catalog&);

inline std::unique_ptr<Discount> buildPercentOffCart(const cart::CouponRule& rule, const Catalog&) {
  if (rule.value < 1 || rule.value > 100) return nullptr;
  return std::make_unique<PercentOffCart>(rule.value);
}

inline std::unique_ptr<Discount> buildAmountOffCart(const cart::CouponRule& rule, const Catalog&) {
  if (rule.value < 1 || rule.value > cart::kMaxPrice) return nullptr;
  return std::make_unique<AmountOffCart>(rule.value);
}

inline std::unique_ptr<Discount> buildPercentOffSku(const cart::CouponRule& rule, const Catalog& catalog) {
  if (rule.value < 1 || rule.value > 100 || !catalog.has(rule.sku)) return nullptr;
  return std::make_unique<PercentOffSku>(rule.sku, rule.value);
}

// Builds the discount a rule describes, wrapped in the minimum-spend rule when it has one, or nullptr when invalid.
inline std::unique_ptr<Discount> makeDiscount(const cart::CouponRule& rule, const Catalog& catalog) {
  static const std::map<cart::CouponRule::Kind, DiscountBuilder> builders = {
      {cart::CouponRule::Kind::PercentOffCart, &buildPercentOffCart},
      {cart::CouponRule::Kind::AmountOffCart, &buildAmountOffCart},
      {cart::CouponRule::Kind::PercentOffSku, &buildPercentOffSku},
  };
  const auto builder = builders.find(rule.kind);
  if (rule.minSubtotal < 0 || builder == builders.end()) return nullptr;
  std::unique_ptr<Discount> discount = builder->second(rule, catalog);
  if (discount == nullptr || rule.minSubtotal == 0) return discount;
  return std::make_unique<MinimumSpend>(std::move(discount), rule.minSubtotal);
}
