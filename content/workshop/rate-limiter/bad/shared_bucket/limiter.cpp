// Bad design: all clients share one bucket.
#include <algorithm>
#include <deque>
#include <map>
#include <memory>
#include <optional>
#include <string>
#include <utility>

#include "api_storm2.h"

namespace {
using namespace rl;

struct Bucket {
  long long tokens;
  long long anchor;
};

struct Grant {
  long long at;
  long long permits;
};

Bucket project(const Bucket& bucket, const Limit& limit, long long now) {
  Bucket state = bucket;
  if (state.tokens >= limit.capacity) {
    state.tokens = limit.capacity;
    state.anchor = now;
    return state;
  }
  const long long earned = (now - state.anchor) / limit.refillEvery;
  state.tokens = std::min(limit.capacity, state.tokens + earned);
  state.anchor = state.tokens >= limit.capacity ? now : state.anchor + earned * limit.refillEvery;
  return state;
}

Decision checkBucket(const Bucket& bucket, const Limit& limit, long long permits, long long now) {
  if (permits > limit.capacity) return {false, Decision::kNever};
  const Bucket state = project(bucket, limit, now);
  if (state.tokens >= permits) return {true, 0};
  const long long missing = permits - state.tokens;
  return {false, missing * limit.refillEvery - (now - state.anchor)};
}

bool inside(const Grant& grant, long long windowTicks, long long now) {
  return grant.at + windowTicks > now;
}

Decision checkWindow(const std::deque<Grant>& grants, const WindowLimit& limit, long long permits, long long now) {
  if (permits > limit.maxPermits) return {false, Decision::kNever};
  long long used = 0;
  for (const Grant& grant : grants) {
    if (inside(grant, limit.windowTicks, now)) used += grant.permits;
  }
  const long long excess = used + permits - limit.maxPermits;
  if (excess <= 0) return {true, 0};
  long long freed = 0;
  for (const Grant& grant : grants) {
    if (!inside(grant, limit.windowTicks, now)) continue;
    freed += grant.permits;
    if (freed >= excess) return {false, grant.at + limit.windowTicks - now};
  }
  return {false, Decision::kNever};
}

Decision merge(const Decision& own, const Decision& global) {
  if (own.allowed) return global;
  if (global.allowed) return own;
  if (own.retryAfter == Decision::kNever || global.retryAfter == Decision::kNever) return {false, Decision::kNever};
  return {false, std::max(own.retryAfter, global.retryAfter)};
}

class LimiterImpl : public RateLimiter {
 public:
  LimiterImpl(std::shared_ptr<Clock> clock, std::optional<Limit> limit, std::optional<WindowLimit> window, std::optional<Limit> global)
      : clock_(std::move(clock)), limit_(limit), window_(window), global_(global) {
    created_ = clock_->now();
    if (global_) globalBucket_ = Bucket{global_->capacity, created_};
  }

  Decision tryAcquire(const std::string& client, long long permits) override {
    if (permits <= 0) return {false, 0};
    const long long now = clock_->now();
    const Decision own = checkOwn(client, permits, now);
    const Decision global = global_ ? checkBucket(globalBucket_, *global_, permits, now) : Decision{true, 0};
    const Decision verdict = merge(own, global);
    if (verdict.allowed) {
      commitOwn(client, permits, now);
      if (global_) commitGlobal(permits, now);
    }
    return verdict;
  }

 private:
  Decision checkOwn(const std::string& client, long long permits, long long now) {
    if (window_) return checkWindow(grants_[client], *window_, permits, now);
    return checkBucket(bucketFor(client), *limit_, permits, now);
  }

  void commitOwn(const std::string& client, long long permits, long long now) {
    if (window_) {
      auto& grants = grants_[client];
      while (!grants.empty() && !inside(grants.front(), window_->windowTicks, now)) grants.pop_front();
      grants.push_back({now, permits});
      return;
    }
    Bucket& bucket = bucketFor(client);
    bucket = project(bucket, *limit_, now);
    bucket.tokens -= permits;
  }

  void commitGlobal(long long permits, long long now) {
    globalBucket_ = project(globalBucket_, *global_, now);
    globalBucket_.tokens -= permits;
  }

  Bucket& bucketFor(const std::string& client) {
    auto found = buckets_.find(std::string());
    if (found == buckets_.end()) found = buckets_.emplace(std::string(), Bucket{limit_->capacity, created_}).first;
    return found->second;
  }

  std::shared_ptr<Clock> clock_;
  std::optional<Limit> limit_;
  std::optional<WindowLimit> window_;
  std::optional<Limit> global_;
  long long created_ = 0;
  Bucket globalBucket_{0, 0};
  std::map<std::string, Bucket> buckets_;
  std::map<std::string, std::deque<Grant>> grants_;
};
}  // namespace

std::unique_ptr<RateLimiter> rl::makeLimiter(std::shared_ptr<Clock> clock, Limit limit) {
  if (clock == nullptr || limit.capacity <= 0 || limit.refillEvery <= 0) return nullptr;
  return std::make_unique<LimiterImpl>(std::move(clock), limit, std::nullopt, std::nullopt);
}

std::unique_ptr<RateLimiter> rl::makeWindowLimiter(std::shared_ptr<Clock> clock, WindowLimit limit) {
  if (clock == nullptr || limit.maxPermits <= 0 || limit.windowTicks <= 0) return nullptr;
  return std::make_unique<LimiterImpl>(std::move(clock), std::nullopt, limit, std::nullopt);
}

std::unique_ptr<RateLimiter> rl::makeLayeredLimiter(std::shared_ptr<Clock> clock, Limit perClient, Limit global) {
  if (clock == nullptr || perClient.capacity <= 0 || perClient.refillEvery <= 0 || global.capacity <= 0 || global.refillEvery <= 0) return nullptr;
  return std::make_unique<LimiterImpl>(std::move(clock), perClient, std::nullopt, global);
}
