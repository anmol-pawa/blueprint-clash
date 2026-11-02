#pragma once
#include <memory>
#include <utility>
#include "api.h"

class RegularPrice : public PricingStrategy {
 public:
  long long price(long long unitCents, int quantity) const override { return unitCents * quantity; }
};

// TODO: implement the discount rule.
class BulkDiscount : public PricingStrategy {
 public:
  BulkDiscount(int minQuantity, int percentOff) : minQuantity_(minQuantity), percentOff_(percentOff) {}
  long long price(long long unitCents, int quantity) const override { return unitCents * quantity; }

 private:
  int minQuantity_;
  int percentOff_;
};

// TODO: depend on the abstraction, never on a concrete rule.
class Checkout {
 public:
  explicit Checkout(std::unique_ptr<PricingStrategy> strategy) { (void)strategy; }
  void setStrategy(std::unique_ptr<PricingStrategy> strategy) { (void)strategy; }
  long long total(long long unitCents, int quantity) const { return unitCents * quantity; }
};
