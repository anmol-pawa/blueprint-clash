#pragma once
#include "api.h"

// The state of one key under one algorithm. It knows the numbers but never the clock: callers pass `now`.
class Limit {
 public:
  virtual ~Limit() = default;
  virtual rl::Decision tryAcquire(long long now, long long cost) = 0;
  // True when the state is indistinguishable from a key never seen, so it can be forgotten safely.
  virtual bool isIdle(long long now) const = 0;
};
