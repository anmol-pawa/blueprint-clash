#pragma once
#include <algorithm>

#include "limit_policy.h"

// Token bucket with whole tokens and integer time, so there is no floating-point drift. The state is the number of
// tokens and `anchor`, the tick from which the time to the next token is counted. A full bucket has no progress to
// remember, so its anchor follows the clock; the first token taken out of a full bucket starts the countdown.
class TokenBucket : public LimitPolicy {
 public:
  explicit TokenBucket(rl::Limit limit) : limit_(limit), tokens_(limit.capacity) {}

  rl::Decision check(long long permits, long long now) const override {
    if (permits > limit_.capacity) return {false, rl::Decision::kNever};
    const State state = project(now);
    if (state.tokens >= permits) return {true, 0};
    const long long missing = permits - state.tokens;
    return {false, missing * limit_.refillEvery - (now - state.anchor)};
  }

  void commit(long long permits, long long now) override {
    const State state = project(now);
    tokens_ = state.tokens - permits;
    anchor_ = state.anchor;
  }

 private:
  struct State {
    long long tokens;
    long long anchor;
  };

  // What the bucket would hold at `now`: whole tokens earned since the anchor, capped at the capacity.
  State project(long long now) const {
    if (tokens_ >= limit_.capacity) return {limit_.capacity, now};
    const long long earned = (now - anchor_) / limit_.refillEvery;
    const long long tokens = std::min(limit_.capacity, tokens_ + earned);
    return {tokens, tokens >= limit_.capacity ? now : anchor_ + earned * limit_.refillEvery};
  }

  rl::Limit limit_;
  long long tokens_;
  long long anchor_ = 0;
};
