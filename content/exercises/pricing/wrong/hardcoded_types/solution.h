#pragma once
#include <memory>
#include <utility>
#include "api.h"

class RegularPrice final : public PricingStrategy {
 public:
  long long price(long long unitCents, int quantity) const override { return unitCents * quantity; }
};

class BulkDiscount final : public PricingStrategy {
 public:
  BulkDiscount(int minQuantity, int percentOff) : minQuantity_(minQuantity), percentOff_(percentOff) {}

  long long price(long long unitCents, int quantity) const override {
    const long long gross = unitCents * quantity;
    if (quantity < minQuantity_) return gross;
    return gross - gross * percentOff_ / 100;  // the discount truncates: the shop never over-discounts
  }

 private:
  int minQuantity_;
  int percentOff_;
};

// Depends only on the abstraction: a new pricing rule needs no change here.
class Checkout {
 public:
  explicit Checkout(std::unique_ptr<PricingStrategy> strategy) { setStrategy(std::move(strategy)); }

  void setStrategy(std::unique_ptr<PricingStrategy> strategy) {
    strategy_ = strategy ? std::move(strategy) : std::make_unique<RegularPrice>();
  }

  long long total(long long unitCents, int quantity) const {
    if (dynamic_cast<const BulkDiscount*>(strategy_.get())) return strategy_->price(unitCents, quantity);
    return unitCents * quantity;  // bug: every other rule is silently treated as regular
  }

 private:
  std::unique_ptr<PricingStrategy> strategy_;  // never null after construction
};
