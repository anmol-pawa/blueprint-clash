#pragma once
#include "api.h"

// A stay as a half-open range of nights: checkIn is the first night, checkOut is the day the guest leaves and is
// NOT a night. Every question about nights, length and "how far away" is answered here and nowhere else.
class StayRange {
 public:
  StayRange(long long checkIn, long long checkOut) : in_(checkIn), out_(checkOut) {}

  bool isValid() const { return out_ > in_ && out_ - in_ <= hotel::kMaxNights; }
  long long firstNight() const { return in_; }
  long long endDay() const { return out_; }  // one past the last night
  bool startsBefore(long long day) const { return in_ < day; }
  bool hasStartedBy(long long today) const { return in_ <= today; }
  long long daysUntilStart(long long today) const { return in_ - today; }

 private:
  long long in_;
  long long out_;
};
