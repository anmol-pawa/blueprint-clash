#pragma once
// Change Storm 1 adds a second algorithm. Everything from api.h still holds.
#include "api.h"

namespace rl {

// A sliding window: at most `maxPermits` permits may be granted to one client in any span of `windowTicks`
// consecutive ticks. A request granted at tick t counts against the client at ticks t .. t + windowTicks - 1 and is
// forgotten from tick t + windowTicks on. A refused request is not remembered and does not count.
// retryAfter is the smallest wait after which the same request would be granted, given the permits still inside the
// window: for a request that must wait for several earlier grants to expire it is when enough of them have.
struct WindowLimit {
  long long maxPermits = 0;
  long long windowTicks = 0;
};

// Returns nullptr when the clock is null or maxPermits <= 0 or windowTicks <= 0.
// The rules of api.h about permits <= 0, permits that can never fit, all-or-nothing and per-client allowances hold.
std::unique_ptr<RateLimiter> makeWindowLimiter(std::shared_ptr<Clock> clock, WindowLimit limit);

}  // namespace rl
