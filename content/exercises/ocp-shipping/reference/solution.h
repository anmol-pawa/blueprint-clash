#pragma once
#include <cstddef>
#include <memory>
#include <utility>
#include <vector>
#include "api.h"

// The calculator knows the stable policy (cheapest matching rule, -1 if none).
// What varies (carriers, promotions) lives in ShippingRule subclasses it has never seen.
class ShippingCalculator {
 public:
  void add(std::unique_ptr<ShippingRule> rule) {
    if (rule) rules_.push_back(std::move(rule));
  }

  long long quote(const Parcel& parcel) const {
    long long best = -1;
    for (const auto& rule : rules_) {
      if (!rule->matches(parcel)) continue;
      const long long price = rule->cents(parcel);
      if (best < 0 || price < best) best = price;
    }
    return best;
  }

  std::size_t ruleCount() const { return rules_.size(); }

 private:
  std::vector<std::unique_ptr<ShippingRule>> rules_;
};
