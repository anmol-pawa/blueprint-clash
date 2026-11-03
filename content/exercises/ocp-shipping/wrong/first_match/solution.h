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
    for (const auto& rule : rules_) {
      if (rule->matches(parcel)) return rule->cents(parcel);  // registration order decides the price
    }
    return -1;
  }
  std::size_t ruleCount() const { return rules_.size(); }

 private:
  std::vector<std::unique_ptr<ShippingRule>> rules_;
};
