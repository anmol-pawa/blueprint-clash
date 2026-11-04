#pragma once
#include <string>

// Four independent subsystems. Each has its own small vocabulary and none knows about the others.
class Inventory {
 public:
  virtual ~Inventory() = default;
  // Holds stock for an order. Returns false when there is not enough.
  virtual bool reserve(const std::string& sku, int quantity) = 0;
  // Gives a held reservation back.
  virtual void release(const std::string& sku, int quantity) = 0;
};

class Payments {
 public:
  virtual ~Payments() = default;
  virtual bool charge(const std::string& customer, long long cents) = 0;
};

class Shipping {
 public:
  virtual ~Shipping() = default;
  // Schedules a parcel and returns its tracking id.
  virtual std::string schedule(const std::string& customer, const std::string& sku, int quantity) = 0;
};

class Mailer {
 public:
  virtual ~Mailer() = default;
  virtual void sendConfirmation(const std::string& customer, const std::string& trackingId) = 0;
};

struct Order {
  std::string customer;
  std::string sku;
  int quantity = 0;
  long long unitCents = 0;
};

enum class CheckoutStatus { Ok, InvalidOrder, OutOfStock, PaymentDeclined };

struct CheckoutResult {
  CheckoutStatus status = CheckoutStatus::InvalidOrder;
  std::string trackingId;   // set only when status is Ok
  long long chargedCents = 0;  // set only when status is Ok
};
