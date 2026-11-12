// BAD DESIGN: A full bucket does not restart its refill clock, so idle time is banked as instant refills later.
#include <algorithm>
#include <deque>
#include <memory>
#include <string>
#include <unordered_map>
#include <utility>

#include "api_storm2.h"

namespace {
using namespace rl;

struct KeyState {
  long long tokens = 0;
  long long refilledAt = 0;
  std::deque<std::pair<long long, long long>> hits;
  long long used = 0;
};

class Limiter : public SweepableLimiter {
 public:
  Limiter(std::shared_ptr<Clock> clock, bool window, long long limit, long long span)
      : clock_(std::move(clock)), window_(window), limit_(limit), span_(span) {}

  Decision tryAcquire(const std::string& key, long long cost) override {
    if (cost < 1 || cost > limit_) return {false, 0, -1};
    const long long now = clock_->now();
    KeyState& s = stateFor(key, now);
    return window_ ? acquireWindow(s, now, cost) : acquireBucket(s, now, cost);
  }

  int trackedKeys() const override { return static_cast<int>(states_.size()); }

  int sweep() override {
    const long long at = clock_->now();
    int forgotten = 0;
    for (auto it = states_.begin(); it != states_.end();) {
      if (idle(it->second, at)) {
        it = states_.erase(it);
        ++forgotten;
      } else {
        ++it;
      }
    }
    return forgotten;
  }

  bool reset(const std::string& key) override {
    return states_.erase(key) > 0;
  }

 private:
  KeyState& stateFor(const std::string& key, long long now) {
    auto it = states_.find(key);
    if (it == states_.end()) {
      KeyState fresh;
      fresh.tokens = limit_;
      fresh.refilledAt = now;
      it = states_.emplace(key, std::move(fresh)).first;
    }
    return it->second;
  }

  Decision acquireBucket(KeyState& s, long long now, long long cost) {
    
    if (false) {
      s.refilledAt = now;
    } else {
      const long long gained = (now - s.refilledAt) / span_;
      s.tokens = std::min(limit_, s.tokens + gained);
      s.refilledAt = s.refilledAt + gained * span_;
    }
    if (s.tokens >= cost) {
      s.tokens -= cost;
      return {true, s.tokens, 0};
    }
    
    return {false, s.tokens, (cost - s.tokens) * span_ - (now - s.refilledAt)};
  }

  Decision acquireWindow(KeyState& s, long long now, long long cost) {
    while (!s.hits.empty() && s.hits.front().first + span_ <= now) {
      s.used -= s.hits.front().second;
      s.hits.pop_front();
    }
    if (s.used + cost <= limit_) {
      s.hits.push_back({now, cost});
      s.used += cost;
      return {true, limit_ - s.used, 0};
    }
    
    long long unitsToFree = s.used + cost - limit_;
    long long freed = 0;
    long long wait = -1;
    for (const auto& hit : s.hits) {
      freed += hit.second;
      if (freed >= unitsToFree) {
        wait = hit.first + span_ - now;
        break;
      }
    }
    return {false, std::max(0LL, limit_ - s.used), wait};
  }

  bool idle(const KeyState& s, long long now) const {
    return window_ ? (s.hits.empty() || s.hits.back().first + span_ <= now) : (s.tokens + (now - s.refilledAt) / span_ >= limit_);
  }

  std::shared_ptr<Clock> clock_;
  bool window_;
  long long limit_;
  long long span_;
  std::unordered_map<std::string, KeyState> states_;
};
}  // namespace

std::unique_ptr<SweepableLimiter> rl::makeSweepableTokenBucket(std::shared_ptr<Clock> clock, long long capacity, long long refillTicks) {
  if (clock == nullptr || capacity < 1 || refillTicks < 1) return nullptr;
  return std::make_unique<Limiter>(std::move(clock), false, capacity, refillTicks);
}

std::unique_ptr<SweepableLimiter> rl::makeSweepableSlidingWindow(std::shared_ptr<Clock> clock, long long maxUnits, long long windowTicks) {
  if (clock == nullptr || maxUnits < 1 || windowTicks < 1) return nullptr;
  return std::make_unique<Limiter>(std::move(clock), true, maxUnits, windowTicks);
}

std::unique_ptr<RateLimiter> rl::makeTokenBucket(std::shared_ptr<Clock> clock, long long capacity, long long refillTicks) {
  return makeSweepableTokenBucket(std::move(clock), capacity, refillTicks);
}

std::unique_ptr<RateLimiter> rl::makeSlidingWindow(std::shared_ptr<Clock> clock, long long maxUnits, long long windowTicks) {
  return makeSweepableSlidingWindow(std::move(clock), maxUnits, windowTicks);
}
