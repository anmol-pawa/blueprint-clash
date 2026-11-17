#pragma once
#include <map>
#include <string>

#include "basket.h"

// One wish list per customer. It holds no stock and knows no prices.
class CartBook {
 public:
  void add(const std::string& customer, const std::string& sku, int quantity) { carts_[customer][sku] += quantity; }

  int quantityOf(const std::string& customer, const std::string& sku) const {
    const auto cart = carts_.find(customer);
    if (cart == carts_.end()) return 0;
    const auto line = cart->second.find(sku);
    return line == cart->second.end() ? 0 : line->second;
  }

  // Takes units off a line; the line goes away when nothing is left, and so does an empty cart.
  void remove(const std::string& customer, const std::string& sku, int quantity) {
    auto cart = carts_.find(customer);
    if (cart == carts_.end()) return;
    auto line = cart->second.find(sku);
    if (line == cart->second.end()) return;
    if (quantity >= line->second) cart->second.erase(line);
    else line->second -= quantity;
    if (cart->second.empty()) carts_.erase(cart);
  }

  Lines lines(const std::string& customer) const {
    const auto cart = carts_.find(customer);
    return cart == carts_.end() ? Lines{} : cart->second;
  }

  void clear(const std::string& customer) { carts_.erase(customer); }

 private:
  std::map<std::string, Lines> carts_;
};
