#pragma once
#include <algorithm>
#include <vector>

#include "roster.h"

// Chooses the driver for a request out of the candidates in range. A Strategy: the facade never learns the rule.
class Matcher {
 public:
  virtual ~Matcher() = default;
  // `candidates` is never empty and is in name order.
  virtual std::string choose(const std::vector<Candidate>& candidates) const = 0;
};

// The nearest driver; ties go to the name that sorts first.
class NearestDriver : public Matcher {
 public:
  std::string choose(const std::vector<Candidate>& candidates) const override {
    return std::min_element(candidates.begin(), candidates.end(), &NearestDriver::closer)->driver;
  }

 private:
  static bool closer(const Candidate& a, const Candidate& b) {
    if (a.distance != b.distance) return a.distance < b.distance;
    return a.driver < b.driver;
  }
};
