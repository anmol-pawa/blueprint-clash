#pragma once
// Change Storm 2 adds a limit on the whole service. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace rl {

// Two token buckets at once. Each client has its own bucket (`perClient`), and all clients together share one bucket
// (`global`, full at the start). A request is granted only if BOTH buckets can pay for it, and then both pay.
// If either refuses, neither is charged. When both refuse, retryAfter is the longer of the two waits (the request
// needs both); if either can never pay, retryAfter is Decision::kNever.
// Returns nullptr when the clock is null or either limit has capacity <= 0 or refillEvery <= 0.
std::unique_ptr<RateLimiter> makeLayeredLimiter(std::shared_ptr<Clock> clock, Limit perClient, Limit global);

}  // namespace rl
