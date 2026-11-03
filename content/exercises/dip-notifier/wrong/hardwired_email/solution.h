#pragma once
#include <string>
#include "api.h"

// Low-level detail created inside the high-level class.
class EmailSender : public MessageSender {
 public:
  bool send(const std::string&, const std::string&) override { return true; }
};

class OrderService {
 public:
  explicit OrderService(MessageSender& sender) { (void)sender; }
  bool placeOrder(const std::string& customer, int quantity) {
    if (quantity <= 0) return false;
    EmailSender email;
    if (!email.send(customer, "Order confirmed: " + std::to_string(quantity) + " item(s)")) return false;
    ++confirmed_;
    return true;
  }
  int confirmedCount() const { return confirmed_; }

 private:
  int confirmed_ = 0;
};
