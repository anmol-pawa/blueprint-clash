#pragma once
#include <algorithm>
#include <array>
#include <memory>

#include "api_storm1.h"

// How long to wait after the n-th failed attempt (Strategy). The caller applies the cap.
class BackoffRule {
 public:
  virtual ~BackoffRule() = default;
  virtual long long delayAfter(int failedAttempts, long long base) const = 0;
};

class FixedBackoff : public BackoffRule {
 public:
  long long delayAfter(int, long long base) const override { return base; }
};

class LinearBackoff : public BackoffRule {
 public:
  long long delayAfter(int failedAttempts, long long base) const override { return base * failedAttempts; }
};

class ExponentialBackoff : public BackoffRule {
 public:
  long long delayAfter(int failedAttempts, long long base) const override { return base * (1LL << (failedAttempts - 1)); }
};

inline std::shared_ptr<const BackoffRule> makeRule(jobq::Backoff which) {
  static const std::array<std::shared_ptr<const BackoffRule>, 3> table = {
      std::make_shared<FixedBackoff>(), std::make_shared<LinearBackoff>(), std::make_shared<ExponentialBackoff>()};
  return table[static_cast<std::size_t>(which)];
}
