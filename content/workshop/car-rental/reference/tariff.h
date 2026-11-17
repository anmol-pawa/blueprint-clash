#pragma once
#include <map>
#include <string>

#include "time_span.h"

// What each category costs per started day, and what a rental of it costs in total.
class Tariff {
 public:
  bool add(const std::string& category, rental::Money dailyRate) {
    if (category.empty() || dailyRate < 1 || dailyRate > rental::kMaxDailyRate) return false;
    return rates_.emplace(category, dailyRate).second;
  }
  bool knows(const std::string& category) const { return rates_.count(category) > 0; }
  rental::Money dailyRate(const std::string& category) const { return rates_.at(category); }
  rental::Money totalFor(const std::string& category, const TimeSpan& span) const {
    return dailyRate(category) * span.startedDays();
  }

 private:
  std::map<std::string, rental::Money> rates_;
};
