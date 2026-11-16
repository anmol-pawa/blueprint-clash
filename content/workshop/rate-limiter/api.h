#pragma once
// Public API for the Rate limiter library problem. The hidden tests only use what is declared here.
// You implement rl::makeLimiter() (in any of your .cpp files); everything behind it is your design.
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
//   allowed     true when the request may go ahead (and has used up its permits).
//   retryAfter  0 when allowed. When refused: the smallest number of ticks to wait, with no other request in
//               between, after which the same request would be allowed; kNever if it can never be allowed.
struct Decision {
  static constexpr long long kNever = -1;
  bool allowed = false;
  long long retryAfter = 0;
};

// A token bucket: it holds at most `capacity` tokens, and one token is added every `refillEvery` ticks.
struct Limit {
  long long capacity = 0;
  long long refillEvery = 0;
};

// Decides whether a client may do something right now. Every client (any string, the empty one included) has its own
// allowance; clients never affect one another.
class RateLimiter {
 public:
  virtual ~RateLimiter() = default;

  // Asks to use `permits` tokens for `client`. Either all the permits are granted or none are: a refused
  // request changes nothing. permits <= 0 is refused with retryAfter 0 and changes nothing. A request for more
  // permits than the limit can ever hold is refused with retryAfter == Decision::kNever.
  virtual Decision tryAcquire(const std::string& client, long long permits = 1) = 0;
};

// Token bucket per client. A client seen for the first time has a full bucket. Tokens come back one per
// `refillEvery` ticks while the bucket is not full: the time since the last token is remembered, so waiting 7
// ticks and then 3 more earns a token, and 25 idle ticks with refillEvery 10 earn two tokens and keep 5 ticks
// of progress towards the third. A full bucket stores no progress: the clock for the next token starts when
// tokens are first taken out of a full bucket. The bucket never holds more than `capacity`.
// Returns nullptr when the clock is null or capacity <= 0 or refillEvery <= 0.
std::unique_ptr<RateLimiter> makeLimiter(std::shared_ptr<Clock> clock, Limit limit);

}  // namespace rl
