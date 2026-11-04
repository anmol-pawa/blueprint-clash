#pragma once
#include <string>
#include "api.h"

// Facade: one call hides the order, the compensation on failure and the four vocabularies.
// It holds references only, so tests (and other callers) can still use the subsystems directly.
class Checkout {
 public:
  Checkout(Inventory& inventory, Payments& payments, Shipping& shipping, Mailer& mailer)
      : inventory_(inventory), payments_(payments), shipping_(shipping), mailer_(mailer) {}

  CheckoutResult place(const Order& order) {
    CheckoutResult result;
    if (!inventory_.reserve(order.sku, order.quantity)) {
      result.status = CheckoutStatus::OutOfStock;
      return result;
    }
    const long long total = order.quantity * order.unitCents;
    if (!payments_.charge(order.customer, total)) {
      inventory_.release(order.sku, order.quantity);  // compensate: nobody paid for this stock
      result.status = CheckoutStatus::PaymentDeclined;
      return result;
    }
    result.trackingId = shipping_.schedule(order.customer, order.sku, order.quantity);
    mailer_.sendConfirmation(order.customer, result.trackingId);
    result.status = CheckoutStatus::Ok;
    result.chargedCents = total;
    return result;
  }

 private:
  static bool isValid(const Order& o) {
    return !o.customer.empty() && !o.sku.empty() && o.quantity > 0 && o.unitCents > 0;
  }

  Inventory& inventory_;
  Payments& payments_;
  Shipping& shipping_;
  Mailer& mailer_;
};
