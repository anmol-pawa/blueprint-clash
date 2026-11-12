#pragma once
// Change Storm 2 adds housekeeping: a limiter that remembers a key forever leaks memory. Everything from api.h and
// api_storm1.h still holds.
#include "api_storm1.h"

namespace rl {

class SweepableLimiter : public RateLimiter {
 public:
  // How many keys the limiter currently holds state for. A key gets state the first time it is asked with a cost
  // between 1 and the capacity (so refused-forever requests create nothing).
  virtual int trackedKeys() const = 0;

  // Forgets every key whose state is indistinguishable from a key never seen, and returns how many it forgot.
  // A token bucket key qualifies once it has refilled to capacity (exactly at the tick the last token arrives).
  // A window key qualifies once none of its recorded requests is still inside the window.
  // A key that is not idle must be kept: forgetting it would hand out units it has not earned.
  virtual int sweep() = 0;

  // Forgets one key, giving it a full allowance again (an operator action). Returns true if the key was tracked.
  virtual bool reset(const std::string& key) = 0;
};

// Same algorithms as makeTokenBucket and makeSlidingWindow, with the housekeeping above.
std::unique_ptr<SweepableLimiter> makeSweepableTokenBucket(std::shared_ptr<Clock> clock, long long capacity, long long refillTicks);
std::unique_ptr<SweepableLimiter> makeSweepableSlidingWindow(std::shared_ptr<Clock> clock, long long maxUnits, long long windowTicks);

}  // namespace rl
