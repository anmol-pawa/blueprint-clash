#pragma once
#include <deque>

#include "limit.h"

// Keeps the allowed requests of the last `windowTicks` ticks, oldest first, with their costs.
class SlidingWindowLimit : public Limit {
 public:
  SlidingWindowLimit(long long maxUnits, long long windowTicks) : maxUnits_(maxUnits), windowTicks_(windowTicks) {}

  rl::Decision tryAcquire(long long now, long long cost) override {
    forgetExpired(now);
    if (used_ + cost <= maxUnits_) {
      hits_.push_back({now, cost});
      used_ += cost;
      return {true, maxUnits_ - used_, 0};
    }
    return {false, maxUnits_ - used_, waitFor(now, used_ + cost - maxUnits_)};
  }

  bool isIdle(long long now) const override { return hits_.empty() || hits_.back().at + windowTicks_ <= now; }

 private:
  struct Hit {
    long long at;
    long long units;
  };

  void forgetExpired(long long now) {
    while (!hits_.empty() && hits_.front().at + windowTicks_ <= now) {
      used_ -= hits_.front().units;
      hits_.pop_front();
    }
  }

  // Walks from the oldest hit until enough units would have left the window.
  long long waitFor(long long now, long long unitsToFree) const {
    long long freed = 0;
    for (const Hit& hit : hits_) {
      freed += hit.units;
      if (freed >= unitsToFree) return hit.at + windowTicks_ - now;
    }
    return -1;  // unreachable: the cost was checked against maxUnits_ before the call
  }

  long long maxUnits_;
  long long windowTicks_;
  long long used_ = 0;
  std::deque<Hit> hits_;
};
