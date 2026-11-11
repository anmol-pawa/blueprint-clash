#pragma once
#include <array>

#include "api.h"

// Whole hours charged for a stay: every started hour counts, and a stay is at least one hour.
inline int startedHours(int minutes) { return minutes <= 60 ? 1 : (minutes + 59) / 60; }

// The rule for "what does this stay cost?". The extension seam for new pricing.
class FeePolicy {
 public:
  virtual ~FeePolicy() = default;
  virtual long long feeCents(park::Vehicle vehicle, int minutesParked) const = 0;
};

// Base phase: one flat rate for everybody.
class HourlyFeePolicy : public FeePolicy {
 public:
  explicit HourlyFeePolicy(long long centsPerHour) : centsPerHour_(centsPerHour) {}
  long long feeCents(park::Vehicle, int minutesParked) const override { return centsPerHour_ * startedHours(minutesParked); }

 private:
  long long centsPerHour_;
};

// Storm 1: a rate per vehicle type and a free grace period. A new class; FeePolicy and its callers are untouched.
class RatedFeePolicy : public FeePolicy {
 public:
  RatedFeePolicy(std::array<long long, 3> centsPerHourByVehicle, int graceMinutes)
      : rates_(centsPerHourByVehicle), graceMinutes_(graceMinutes) {}

  long long feeCents(park::Vehicle vehicle, int minutesParked) const override {
    if (minutesParked <= graceMinutes_) return 0;
    return rates_[static_cast<std::size_t>(vehicle)] * startedHours(minutesParked);
  }

 private:
  std::array<long long, 3> rates_;  // indexed by Vehicle: motorcycle, car, truck
  int graceMinutes_;
};
