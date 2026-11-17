#pragma once
#include <algorithm>

#include "api.h"

constexpr int kPercentDivisor = 100;

// What a car that comes back `lateHours` after its drop-off hour costs on top of the total.
class LateFee {
 public:
  virtual ~LateFee() = default;
  virtual rental::Money extra(rental::Money dailyRate, long long lateHours) const = 0;
};

class NoLateFee : public LateFee {
 public:
  rental::Money extra(rental::Money, long long) const override { return 0; }
};

class GraceThenPercent : public LateFee {
 public:
  GraceThenPercent(int graceHours, int percentPerHour) : grace_(graceHours), percent_(percentPerHour) {}

  static bool isValid(int graceHours, int percentPerHour) {
    return graceHours >= 0 && percentPerHour >= 0 && percentPerHour <= kMaxPercent;
  }

  rental::Money extra(rental::Money dailyRate, long long lateHours) const override {
    const long long billable = std::max(0LL, lateHours - grace_);
    return dailyRate * billable * percent_ / kPercentDivisor;
  }

 private:
  static constexpr int kMaxPercent = 1000;
  int grace_;
  int percent_;
};
