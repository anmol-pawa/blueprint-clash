#pragma once
#include <map>
#include <optional>
#include <string>

#include "basket.h"

// Units on the shelf. Moving stock for a whole set of lines is all or nothing: canTake() is asked first and take()
// then cannot fail.
class Inventory {
 public:
  void setStock(const std::string& sku, int units) { units_[sku] = units; }

  std::optional<int> stock(const std::string& sku) const {
    const auto it = units_.find(sku);
    if (it == units_.end()) return std::nullopt;
    return it->second;
  }

  bool canTake(const Lines& lines) const {
    for (const auto& [sku, wanted] : lines) {
      if (wanted > units_.at(sku)) return false;
    }
    return true;
  }

  void take(const Lines& lines) {
    for (const auto& [sku, wanted] : lines) units_.at(sku) -= wanted;
  }

  void give(const Lines& lines) {
    for (const auto& [sku, returned] : lines) units_.at(sku) += returned;
  }

 private:
  std::map<std::string, int> units_;
};
