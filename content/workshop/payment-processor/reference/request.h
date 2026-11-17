#pragma once
#include <string>

#include "api_storm1.h"

// What a request asked for, reduced to what must match for a repeated call to count as "the same request".
struct RequestShape {
  enum class Kind { Pay, Refund };
  Kind kind = Kind::Pay;
  std::string target;  // the card for a payment, the payment id for a refund
  pay::Money amount = 0;
};

inline bool operator==(const RequestShape& a, const RequestShape& b) {
  return a.kind == b.kind && a.target == b.target && a.amount == b.amount;
}

// The final answer a request got. A temporary error is never an answer.
struct Answer {
  pay::Reply reply = pay::Reply::Declined;
  pay::PaymentId id = pay::kNoPayment;
};
