#pragma once
#include <string>
#include "api.h"

// TODO: implement the Checkout facade. place() validates, reserves stock, charges, and only then ships and
// emails. If the charge is declined, give the reservation back. Keep references to the subsystems.
class Checkout {
 public:
  Checkout(Inventory& inventory, Payments& payments, Shipping& shipping, Mailer& mailer)
      : inventory_(inventory), payments_(payments), shipping_(shipping), mailer_(mailer) {}

  CheckoutResult place(const Order&) { return CheckoutResult{}; }

 private:
  Inventory& inventory_;
  Payments& payments_;
  Shipping& shipping_;
  Mailer& mailer_;
};
