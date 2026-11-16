#pragma once
#include <algorithm>
#include <vector>

#include "limit_policy.h"

// Decides a request against several policies at once: all of them are asked first, and only if every one says yes
// is any of them charged. That is what makes "refused means nothing changed" true however many layers there are.
class Admission {
 public:
  static rl::Decision decide(const std::vector<LimitPolicy*>& policies, long long permits, long long now) {
    rl::Decision verdict{true, 0};
    for (const LimitPolicy* policy : policies) verdict = merge(verdict, policy->check(permits, now));
    if (verdict.allowed) {
      for (LimitPolicy* policy : policies) policy->commit(permits, now);
    }
    return verdict;
  }

 private:
  // The request needs every policy to say yes, so it has to wait for the slowest one.
  static rl::Decision merge(const rl::Decision& so_far, const rl::Decision& next) {
    if (so_far.allowed) return next;
    if (next.allowed) return so_far;
    if (so_far.retryAfter == rl::Decision::kNever || next.retryAfter == rl::Decision::kNever) {
      return {false, rl::Decision::kNever};
    }
    return {false, std::max(so_far.retryAfter, next.retryAfter)};
  }
};
