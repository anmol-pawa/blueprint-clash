#pragma once
#include <string>
#include "api.h"

// TODO: depend on the MessageSender abstraction. Do not create a sender yourself.
class OrderService {
 public:
  explicit OrderService(MessageSender& sender) { (void)sender; }
  bool placeOrder(const std::string& customer, int quantity) {
    (void)customer;
    (void)quantity;
    return false;
  }
  int confirmedCount() const { return 0; }
};
