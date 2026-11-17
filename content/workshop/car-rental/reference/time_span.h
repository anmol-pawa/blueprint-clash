#pragma once
#include "api.h"

constexpr int kHoursPerDay = 24;

// A rental as a half-open range of hours: `from` is the first hour the car is held, `to` is the hour it comes back
// and is NOT held. Every question about hours, length and billing is answered here and nowhere else.
class TimeSpan {
 public:
  TimeSpan(long long from, long long to) : from_(from), to_(to) {}

  bool isValid() const { return to_ > from_ && to_ - from_ <= rental::kMaxHours; }
  long long from() const { return from_; }
  long long to() const { return to_; }
  bool startsBefore(long long hour) const { return from_ < hour; }
  bool overlaps(const TimeSpan& other) const { return from_ < other.to_ && other.from_ < to_; }
  // The same rental, ended early at `hour` (clamped so it never ends before it starts).
  TimeSpan endedAt(long long hour) const { return TimeSpan(from_, hour < from_ ? from_ : (hour < to_ ? hour : to_)); }
  bool isEmpty() const { return to_ <= from_; }
  // Started days: 1 to 24 hours is one day, 25 to 48 is two.
  long long startedDays() const { return (to_ - from_ + kHoursPerDay - 1) / kHoursPerDay; }

 private:
  long long from_;
  long long to_;
};
