#pragma once
#include <string>
#include <vector>

#include "api.h"

// One available driver as a matcher sees them. An unrated driver already carries the default rating, so a matcher
// never needs to know that unrated drivers exist.
struct Candidate {
  std::string id;
  long long distance = 0;
  long long starSum = 0;
  long long ratingCount = 1;
};

// Strategy: which of the nearby available drivers gets the ride.
class DriverMatcher {
 public:
  virtual ~DriverMatcher() = default;
  // The farthest a driver may be from the pickup to be considered.
  virtual long long reach() const = 0;
  // Index of the chosen candidate, or -1 when the list is empty.
  virtual int choose(const std::vector<Candidate>& candidates) const = 0;
};

namespace matching {
// True when `a` is strictly better than `b` on distance, then id.
inline bool nearerThan(const Candidate& a, const Candidate& b) {
  if (a.distance != b.distance) return a.distance < b.distance;
  return a.id < b.id;
}
// Exact comparison of two average ratings: a.starSum / a.ratingCount > b.starSum / b.ratingCount.
inline bool ratedHigherThan(const Candidate& a, const Candidate& b) {
  return a.starSum * b.ratingCount > b.starSum * a.ratingCount;
}
inline bool sameRating(const Candidate& a, const Candidate& b) {
  return a.starSum * b.ratingCount == b.starSum * a.ratingCount;
}
}  // namespace matching

class NearestMatcher : public DriverMatcher {
 public:
  long long reach() const override { return ride::kMaxPickupDistance; }
  int choose(const std::vector<Candidate>& candidates) const override {
    int best = -1;
    for (int i = 0; i < static_cast<int>(candidates.size()); ++i) {
      if (best < 0 || matching::nearerThan(candidates[i], candidates[best])) best = i;
    }
    return best;
  }
};

class BestRatedMatcher : public DriverMatcher {
 public:
  explicit BestRatedMatcher(long long radius) : radius_(radius) {}
  static bool isValid(long long radius) { return radius >= 1 && radius <= ride::kMaxPickupDistance; }

  long long reach() const override { return radius_; }
  int choose(const std::vector<Candidate>& candidates) const override {
    int best = -1;
    for (int i = 0; i < static_cast<int>(candidates.size()); ++i) {
      if (best < 0 || isBetter(candidates[i], candidates[best])) best = i;
    }
    return best;
  }

 private:
  static bool isBetter(const Candidate& a, const Candidate& b) {
    if (!matching::sameRating(a, b)) return matching::ratedHigherThan(a, b);
    return matching::nearerThan(a, b);
  }
  long long radius_;
};
