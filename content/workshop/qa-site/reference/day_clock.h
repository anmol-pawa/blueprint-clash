#pragma once
#include "api.h"

// The site's current day: it only moves forward.
class DayClock {
 public:
  int today() const { return day_; }

  bool moveTo(int day) {
    if (day < day_ || day > qa::kMaxDay) return false;
    day_ = day;
    return true;
  }

 private:
  int day_ = 0;
};
