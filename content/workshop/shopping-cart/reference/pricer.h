#pragma once
#include <vector>

#include "basket.h"
#include "catalog.h"
#include "discounts.h"

// Turns a cart into money: prices the lines, then folds the attached discounts over the result in order. It owns the
// arithmetic; it knows nothing about customers, stock or where coupons are kept.
class Pricer {
 public:
  Basket price(const Catalog& catalog, const Lines& lines) const {
    Basket basket;
    for (const auto& [sku, quantity] : lines) {
      const cart::Money lineTotal = catalog.price(sku) * quantity;
      basket.lineTotals[sku] = lineTotal;
      basket.subtotal += lineTotal;
    }
    return basket;
  }

  cart::Money total(const Basket& basket, const std::vector<const Discount*>& discounts) const {
    cart::Money running = basket.subtotal;
    for (const Discount* discount : discounts) running -= discount->reduction(basket, running);
    return running;
  }
};
