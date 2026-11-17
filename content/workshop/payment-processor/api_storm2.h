#pragma once
// Change Storm 2 makes idempotency keys expire. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace pay {

// Time, supplied by the caller (the tests move it by hand).
class Clock {
 public:
  virtual ~Clock() = default;
  virtual long long seconds() const = 0;
};

// Like makeRefundingProcessor, but an answer is remembered under its key for exactly `ttlSeconds` seconds from the moment
// it was recorded. A key recorded at time t is live while seconds() < t + ttlSeconds and expired from t + ttlSeconds on.
// An expired key behaves like a key that was never used: the same request is processed again (a new payment id, a new
// gateway call) and a different request is NOT a conflict. Replays do not extend a key's life. Payment and refund keys
// expire the same way. Returns nullptr when ttlSeconds < 1.
std::unique_ptr<RefundingProcessor> makeExpiringProcessor(RefundGateway& gateway, const Clock& clock, long long ttlSeconds);

}  // namespace pay
