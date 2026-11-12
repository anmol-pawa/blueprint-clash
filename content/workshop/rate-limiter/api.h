#pragma once
// Public API for the Rate limiter library problem. The hidden tests only use what is declared here.
// You implement rl::makeTokenBucket() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>

namespace rl {

// A source of time in whole ticks (think milliseconds). It never goes backwards.
// The limiter must read time only through this interface, never from the system clock.
class Clock {
 public:
  virtual ~Clock() = default;
  virtual long long now() const = 0;
};

// The answer to one request.
//   allowed     whether the request may proceed (and, if so, its cost has been used up).
//   remaining   units still available to this key after the call, never negative.
//   retryAfter  0 when allowed. When refused for lack of units: the smallest number of ticks to wait, with no
//               other traffic on the key, after which the same request would be allowed. -1 when the request
//               can never be allowed (its cost is below 1 or above the most the key can ever hold).
struct Decision {
  bool allowed;
  long long remaining;
  long long retryAfter;
};

// Decides, per key (a user, an API token, an IP address), whether a request may go ahead.
class RateLimiter {
 public:
  virtual ~RateLimiter() = default;

  // Asks to use `cost` units for `key`. A refused request uses up nothing. A request whose cost is below 1 or
  // above the capacity is refused with remaining 0 and retryAfter -1, and does not change any state.
  // Different keys never affect each other.
  virtual Decision tryAcquire(const std::string& key, long long cost = 1) = 0;
};

// A token bucket per key. A key seen for the first time starts with a full bucket of `capacity` tokens.
// One token is added every `refillTicks` ticks, up to `capacity`. A request of cost c needs c tokens.
// Progress towards the next token is never lost: with refillTicks 10, a bucket that was emptied at tick 0 has
// one token at tick 10 and two at tick 20, however many times it was asked in between.
// Returns nullptr when the clock is null or capacity or refillTicks is below 1.
std::unique_ptr<RateLimiter> makeTokenBucket(std::shared_ptr<Clock> clock, long long capacity, long long refillTicks);

}  // namespace rl
