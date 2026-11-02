#pragma once

class PricingStrategy {
 public:
  virtual ~PricingStrategy() = default;
  virtual long long price(long long unitCents, int quantity) const = 0;
};
