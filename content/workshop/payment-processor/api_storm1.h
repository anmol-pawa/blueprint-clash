#pragma once
// Change Storm 1 adds refunds. Everything from api.h still holds.
#include "api.h"

namespace pay {

enum class RefundStatus {
  Ok,
  Declined,
  GaveUp,
  InvalidRequest,   // empty key, or an amount below 1
  UnknownPayment,   // no payment with that id
  KeyConflict,      // the key was used before (for a payment or a refund) for a different request
  ExceedsPayment,   // this refund would take the total refunded above what the payment charged
};

struct RefundResult {
  RefundStatus status = RefundStatus::Ok;
  bool replayed = false;
};

// A gateway that can also give money back. The tests script it.
class RefundGateway : public Gateway {
 public:
  virtual Reply refund(const std::string& key, const std::string& card, Money amount) = 0;
};

class RefundingProcessor : public Processor {
 public:
  // Gives `amount` of payment `id` back. Checks, in order:
  //  1. InvalidRequest (empty key, amount < 1).
  //  2. UnknownPayment.
  //  3. The key, exactly as for pay(). Keys of payments and refunds are ONE namespace: a key used for a payment is a
  //     KeyConflict for any refund and the other way round. The same refund again is replayed (replayed = true) with no
  //     gateway call, and it is replayed whatever has happened to the payment since.
  //  4. ExceedsPayment if `amount` is more than what the payment charged minus what was already refunded.
  //  5. The gateway, retried exactly like a charge (same key, at most kMaxAttempts calls, TemporaryError only).
  // Approved and Declined are recorded under the key; GaveUp is not. Only an approved refund counts as refunded.
  virtual RefundResult refund(const std::string& key, PaymentId id, Money amount) = 0;

  // Total refunded so far for the payment; 0 for an unknown id.
  virtual Money refunded(PaymentId id) const = 0;
};

std::unique_ptr<RefundingProcessor> makeRefundingProcessor(RefundGateway& gateway);

}  // namespace pay
