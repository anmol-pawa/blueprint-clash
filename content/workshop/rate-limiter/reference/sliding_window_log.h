#pragma once
#include <deque>

#include "limit_policy.h"

// Sliding window kept as a log of grants. A grant made at tick t is inside the window for ticks t .. t + window - 1.
// Exact (no boundary bursts) and O(grants in the window) memory; the editorial compares the cheaper counters.
class SlidingWindowLog : public LimitPolicy {
 public:
  explicit SlidingWindowLog(rl::WindowLimit limit) : limit_(limit) {}

  rl::Decision check(long long permits, long long now) const override {
    if (permits > limit_.maxPermits) return {false, rl::Decision::kNever};
    long long used = 0;
    for (const Grant& grant : grants_) {
      if (isInside(grant, now)) used += grant.permits;
    }
    const long long excess = used + permits - limit_.maxPermits;
    if (excess <= 0) return {true, 0};
    // Wait until enough of the oldest grants have left the window to make room.
    long long freed = 0;
    for (const Grant& grant : grants_) {
      if (!isInside(grant, now)) continue;
      freed += grant.permits;
      if (freed >= excess) return {false, grant.at + limit_.windowTicks - now};
    }
    return {false, rl::Decision::kNever};  // unreachable: used + permits - max <= used
  }

  void commit(long long permits, long long now) override {
    while (!grants_.empty() && !isInside(grants_.front(), now)) grants_.pop_front();
    grants_.push_back({now, permits});
  }

 private:
  struct Grant {
    long long at;
    long long permits;
  };

  bool isInside(const Grant& grant, long long now) const { return grant.at + limit_.windowTicks > now; }

  rl::WindowLimit limit_;
  std::deque<Grant> grants_;
};
