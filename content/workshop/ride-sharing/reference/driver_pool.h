#pragma once
#include <map>
#include <string>
#include <vector>

#include "api.h"
#include "geometry.h"
#include "matcher.h"

// The drivers: who exists, whether they can take a ride, where they are and how they have been rated.
class DriverPool {
 public:
  bool add(const std::string& id) {
    if (id.empty()) return false;
    return drivers_.emplace(id, Driver{}).second;
  }
  bool exists(const std::string& id) const { return drivers_.count(id) > 0; }

  ride::DriverState state(const std::string& id) const {
    const auto it = drivers_.find(id);
    return it == drivers_.end() ? ride::DriverState::Unknown : it->second.state;
  }
  const ride::Location& where(const std::string& id) const { return drivers_.at(id).where; }

  void setAvailable(const std::string& id, const ride::Location& where) {
    Driver& d = drivers_.at(id);
    d.state = ride::DriverState::Available;
    d.where = where;
  }
  void setOffline(const std::string& id) { drivers_.at(id).state = ride::DriverState::Offline; }
  void setOnTrip(const std::string& id) { drivers_.at(id).state = ride::DriverState::OnTrip; }
  void moveTo(const std::string& id, const ride::Location& where) { drivers_.at(id).where = where; }
  void addRating(const std::string& id, int stars) {
    Driver& d = drivers_.at(id);
    d.starSum += stars;
    d.ratingCount += 1;
  }

  // The average in hundredths, rounded down; the default rating for an unrated driver; 0 for an unknown one.
  long long ratingHundredths(const std::string& id) const {
    const auto it = drivers_.find(id);
    if (it == drivers_.end()) return 0;
    const Candidate c = asCandidate(id, it->second, 0);
    return 100 * c.starSum / c.ratingCount;
  }

  int availableCount() const {
    int n = 0;
    for (const auto& [id, d] : drivers_) n += d.state == ride::DriverState::Available ? 1 : 0;
    return n;
  }

  std::vector<Candidate> availableWithin(const ride::Location& from, long long reach) const {
    std::vector<Candidate> out;
    for (const auto& [id, d] : drivers_) {
      if (d.state != ride::DriverState::Available) continue;
      const long long distance = manhattan(from, d.where);
      if (distance <= reach) out.push_back(asCandidate(id, d, distance));
    }
    return out;
  }

 private:
  struct Driver {
    ride::DriverState state = ride::DriverState::Offline;
    ride::Location where;
    long long starSum = 0;
    long long ratingCount = 0;
  };

  static Candidate asCandidate(const std::string& id, const Driver& d, long long distance) {
    Candidate c;
    c.id = id;
    c.distance = distance;
    const bool unrated = d.ratingCount == 0;
    c.starSum = unrated ? ride::kDefaultStars : d.starSum;
    c.ratingCount = unrated ? 1 : d.ratingCount;
    return c;
  }

  std::map<std::string, Driver> drivers_;
};
