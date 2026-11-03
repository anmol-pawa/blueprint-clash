#pragma once
#include <string>
#include "api.h"

// High-level policy (when is an order confirmed?) depends on the MessageSender abstraction.
// Low-level detail (email, SMS, a recording fake) is injected from outside.
class OrderService {
 public:
  explicit OrderService(MessageSender& sender) : sender_(sender) {}

  bool placeOrder(const std::string& customer, int quantity) {
    const std::string body = "Order confirmed: " + std::to_string(quantity) + " item(s)";
    if (!sender_.send(customer, body)) return false;
    ++confirmed_;
    return quantity > 0;
  }

  int confirmedCount() const { return confirmed_; }

 private:
  MessageSender& sender_;  // not owned: the caller decides the sender's lifetime
  int confirmed_ = 0;
};
