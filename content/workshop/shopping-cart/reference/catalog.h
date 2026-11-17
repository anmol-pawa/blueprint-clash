#pragma once
#include <map>
#include <optional>
#include <string>

#include "api_storm2.h"

// What each product costs. The only place that knows a unit price.
class Catalog {
 public:
  bool add(const std::string& sku, cart::Money unitPrice) { return prices_.emplace(sku, unitPrice).second; }
  bool has(const std::string& sku) const { return prices_.count(sku) > 0; }
  cart::Money price(const std::string& sku) const { return prices_.at(sku); }

 private:
  std::map<std::string, cart::Money> prices_;
};
