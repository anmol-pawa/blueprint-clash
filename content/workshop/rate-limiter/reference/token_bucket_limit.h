#pragma once
#include <algorithm>

#include "limit.h"

// Lazy refill: nothing ticks. Each call works out how many whole tokens arrived since the last refill point and
// moves that point forward by exactly that many intervals, so progress towards the next token is kept.
class TokenBucketLimit : public Limit {
 public:
  TokenBucketLimit(long long capacity, long long refillTicks, long long now)
      : capacity_(capacity), refillTicks_(refillTicks), tokens_(capacity), refilledAt_(now) {}

  rl::Decision tryAcquire(long long now, long long cost) override {
    refill(now);
    if (tokens_ >= cost) {
      tokens_ -= cost;
      return {true, tokens_, 0};
    }
    const long long missing = cost - tokens_;
    return {false, tokens_, missing * refillTicks_ - (now - refilledAt_)};
  }

  bool isIdle(long long now) const override { return tokens_ + (now - refilledAt_) / refillTicks_ >= capacity_; }

 private:
  void refill(long long now) {
    if (tokens_ >= capacity_) {  // nothing to earn while full, so the clock starts again from now
      refilledAt_ = now;
      return;
    }
    const long long gained = (now - refilledAt_) / refillTicks_;
    tokens_ = std::min(capacity_, tokens_ + gained);
    refilledAt_ = tokens_ == capacity_ ? now : refilledAt_ + gained * refillTicks_;
  }

  long long capacity_;
  long long refillTicks_;
  long long tokens_;
  long long refilledAt_;
};
