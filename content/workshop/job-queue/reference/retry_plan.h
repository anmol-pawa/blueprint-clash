#pragma once
#include <algorithm>
#include <memory>

#include "backoff_rule.h"

// One job's retry rules: how many attempts, and how long to wait between them (a rule, a base and a cap).
class RetryPlan {
 public:
  RetryPlan() : RetryPlan(jobq::RetryPolicy{}) {}
  explicit RetryPlan(const jobq::RetryPolicy& p)
      : maxAttempts_(p.maxAttempts), rule_(makeRule(p.backoff)), base_(p.base), cap_(p.cap) {}

  static bool valid(const jobq::RetryPolicy& p) {
    return p.maxAttempts >= 1 && p.maxAttempts <= jobq::kMaxPolicyAttempts && p.base >= 1 && p.base <= jobq::kMaxBaseDelay &&
           p.cap >= p.base && p.cap <= jobq::kMaxDelayCap;
  }

  bool exhausted(int attemptsMade) const { return attemptsMade >= maxAttempts_; }
  long long delayAfter(int failedAttempts) const { return std::min(cap_, rule_->delayAfter(failedAttempts, base_)); }

 private:
  int maxAttempts_;
  std::shared_ptr<const BackoffRule> rule_;
  long long base_;
  long long cap_;
};
