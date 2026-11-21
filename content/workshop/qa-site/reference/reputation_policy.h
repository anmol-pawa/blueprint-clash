#pragma once
#include <map>
#include <vector>

#include "reputation_event.h"

// How events add up to points above the starting reputation (the floor is applied by the caller).
class ReputationPolicy {
 public:
  virtual ~ReputationPolicy() = default;
  virtual int pointsFrom(const std::vector<ReputationEvent>& events) const = 0;
};

class PlainPolicy : public ReputationPolicy {
 public:
  int pointsFrom(const std::vector<ReputationEvent>& events) const override {
    int total = 0;
    for (const ReputationEvent& event : events) total += event.points;
    return total;
  }
};

// Per day, the capped (upvote) points count at most `cap` together; everything else counts in full.
class DailyCapPolicy : public ReputationPolicy {
 public:
  explicit DailyCapPolicy(int cap) : cap_(cap) {}

  int pointsFrom(const std::vector<ReputationEvent>& events) const override {
    std::map<int, int> cappedByDay;
    int uncapped = 0;
    for (const ReputationEvent& event : events) {
      if (event.capped) {
        cappedByDay[event.day] += event.points;
      } else {
        uncapped += event.points;
      }
    }
    int total = uncapped;
    for (const auto& day : cappedByDay) total += day.second < cap_ ? day.second : cap_;
    return total;
  }

 private:
  int cap_;
};
