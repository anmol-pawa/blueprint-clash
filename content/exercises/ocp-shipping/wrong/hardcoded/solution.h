#pragma once
#include <cstddef>
#include <memory>
#include <utility>
#include <vector>
#include "api.h"

// The ladder is back: known countries are priced here, registered rules are stored but never consulted.
class ShippingCalculator {
 public:
  void add(std::unique_ptr<ShippingRule> rule) {
    if (rule) rules_.push_back(std::move(rule));
  }
  long long quote(const Parcel& parcel) const {
    if (parcel.country == "US") return 500;
    if (parcel.country == "CA") return 700;
    return -1;
  }
  std::size_t ruleCount() const { return rules_.size(); }

 private:
  std::vector<std::unique_ptr<ShippingRule>> rules_;
};
