#pragma once
// Change Storm 1 adds a second algorithm behind the same interface. Everything from api.h still holds.
#include "api.h"

namespace rl {

// A sliding-window log per key: at most `maxUnits` units may be used in any window of `windowTicks` ticks.
// A request that is allowed at tick t counts against the window from tick t until tick t + windowTicks - 1 and
// is forgotten from tick t + windowTicks. A request of cost c counts as c units; refused requests are not
// recorded. Fresh keys have all `maxUnits` available. `remaining` is maxUnits minus the units still in the window
// after the call. `retryAfter` is the smallest wait after which enough old units have left the window.
// Costs below 1 or above maxUnits are refused as in api.h.
// Returns nullptr when the clock is null or maxUnits or windowTicks is below 1.
std::unique_ptr<RateLimiter> makeSlidingWindow(std::shared_ptr<Clock> clock, long long maxUnits, long long windowTicks);

}  // namespace rl
