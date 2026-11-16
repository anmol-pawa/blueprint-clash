#include "limiter_impl.h"
#include "sliding_window_log.h"
#include "token_bucket.h"

namespace {
bool valid(const rl::Limit& limit) { return limit.capacity > 0 && limit.refillEvery > 0; }
}  // namespace

std::unique_ptr<rl::RateLimiter> rl::makeLimiter(std::shared_ptr<Clock> clock, Limit limit) {
  if (clock == nullptr || !valid(limit)) return nullptr;
  return std::make_unique<LimiterImpl>(std::move(clock), [limit] { return std::make_unique<TokenBucket>(limit); });
}

std::unique_ptr<rl::RateLimiter> rl::makeWindowLimiter(std::shared_ptr<Clock> clock, WindowLimit limit) {
  if (clock == nullptr || limit.maxPermits <= 0 || limit.windowTicks <= 0) return nullptr;
  return std::make_unique<LimiterImpl>(std::move(clock), [limit] { return std::make_unique<SlidingWindowLog>(limit); });
}

std::unique_ptr<rl::RateLimiter> rl::makeLayeredLimiter(std::shared_ptr<Clock> clock, Limit perClient, Limit global) {
  if (clock == nullptr || !valid(perClient) || !valid(global)) return nullptr;
  return std::make_unique<LimiterImpl>(
      std::move(clock), [perClient] { return std::make_unique<TokenBucket>(perClient); }, std::make_unique<TokenBucket>(global));
}
