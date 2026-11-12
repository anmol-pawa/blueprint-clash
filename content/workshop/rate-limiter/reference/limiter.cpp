#include "limiter_impl.h"
#include "sliding_window_limit.h"
#include "token_bucket_limit.h"

std::unique_ptr<rl::SweepableLimiter> rl::makeSweepableTokenBucket(std::shared_ptr<Clock> clock, long long capacity, long long refillTicks) {
  if (clock == nullptr || capacity < 1 || refillTicks < 1) return nullptr;
  return std::make_unique<LimiterImpl>(std::move(clock), capacity, [capacity, refillTicks](long long now) {
    return std::make_unique<TokenBucketLimit>(capacity, refillTicks, now);
  });
}

std::unique_ptr<rl::SweepableLimiter> rl::makeSweepableSlidingWindow(std::shared_ptr<Clock> clock, long long maxUnits, long long windowTicks) {
  if (clock == nullptr || maxUnits < 1 || windowTicks < 1) return nullptr;
  return std::make_unique<LimiterImpl>(std::move(clock), maxUnits, [maxUnits, windowTicks](long long) {
    return std::make_unique<SlidingWindowLimit>(maxUnits, windowTicks);
  });
}

std::unique_ptr<rl::RateLimiter> rl::makeTokenBucket(std::shared_ptr<Clock> clock, long long capacity, long long refillTicks) {
  return makeSweepableTokenBucket(std::move(clock), capacity, refillTicks);
}

std::unique_ptr<rl::RateLimiter> rl::makeSlidingWindow(std::shared_ptr<Clock> clock, long long maxUnits, long long windowTicks) {
  return makeSweepableSlidingWindow(std::move(clock), maxUnits, windowTicks);
}
