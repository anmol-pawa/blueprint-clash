#pragma once
#include <map>
#include <string>

#include "api.h"

// The trip records: who, which driver, where, the quoted fare and the state. Ids are positive, issued in order and
// never reused; finished trips stay, so their state can still be asked.
struct Trip {
  std::string rider;
  std::string driver;
  ride::Point from;
  ride::Point to;
  ride::Money fare;
  ride::TripState state;
  bool arrived;
};

class Trips {
 public:
  ride::TripId add(Trip trip) {
    const ride::TripId id = next_++;
    trips_[id] = std::move(trip);
    return id;
  }
  Trip* find(ride::TripId id) {
    const auto it = trips_.find(id);
    return it == trips_.end() ? nullptr : &it->second;
  }
  const Trip* find(ride::TripId id) const {
    const auto it = trips_.find(id);
    return it == trips_.end() ? nullptr : &it->second;
  }
  // True when the rider has a trip that is Matched or InProgress.
  bool hasActive(const std::string& rider) const {
    for (const auto& [id, t] : trips_) {
      if (t.rider == rider && (t.state == ride::TripState::Matched || t.state == ride::TripState::InProgress)) return true;
    }
    return false;
  }

 private:
  ride::TripId next_ = 1;
  std::map<ride::TripId, Trip> trips_;
};
