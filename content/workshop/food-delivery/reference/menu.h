#pragma once
#include <map>
#include <optional>
#include <string>
#include <vector>

#include "api_storm2.h"

// What each restaurant sells and for how much. It knows nothing about orders, couriers or discounts.
class Menu {
 public:
  bool add(const std::string& restaurant, const std::vector<food::MenuItem>& items) {
    if (restaurant.empty() || items.empty() || menus_.count(restaurant) > 0) return false;
    std::map<std::string, food::Money> prices;
    for (const food::MenuItem& item : items) {
      if (item.name.empty() || item.price < 1 || !prices.emplace(item.name, item.price).second) return false;
    }
    menus_.emplace(restaurant, std::move(prices));
    return true;
  }

  bool knows(const std::string& restaurant) const { return menus_.count(restaurant) > 0; }

  // The price of one item, or nothing when the restaurant does not sell it. The restaurant must be known.
  std::optional<food::Money> priceOf(const std::string& restaurant, const std::string& item) const {
    const std::map<std::string, food::Money>& prices = menus_.at(restaurant);
    const auto found = prices.find(item);
    if (found == prices.end()) return std::nullopt;
    return found->second;
  }

 private:
  std::map<std::string, std::map<std::string, food::Money>> menus_;
};
