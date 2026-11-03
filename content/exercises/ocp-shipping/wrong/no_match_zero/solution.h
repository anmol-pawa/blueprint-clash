#pragma once
#include <cstddef>
#include <memory>
#include <utility>
#include <vector>
#include "api.h"

class ShippingCalculator {
 public:
  void add(std::unique_ptr<ShippingRule> rule) {
    if (rule) rules_.push_back(std::move(rule));
  }
  long long quote(const Parcel& parcel) const {
    long long best = 0;  // 0 means "free", not "unknown"
    bool found = false;
    for (const auto& rule : rules_) {
      if (!rule->matches(parcel)) continue;
      const long long price = rule->cents(parcel);
      if (!found || price < best) best = price;
      found = true;
    }
    return best;
  }
  std::size_t ruleCount() const { return rules_.size(); }

 private:
  std::vector<std::unique_ptr<ShippingRule>> rules_;
};
