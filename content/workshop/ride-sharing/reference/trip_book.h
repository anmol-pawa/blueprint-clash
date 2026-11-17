#pragma once
#include <map>
#include <set>
#include <string>
#include <utility>

#include "api.h"
#include "trip.h"

// Issues trip ids, keeps every trip for ever and knows which riders have an unfinished one.
class TripBook {
 public:
  ride::TripId open(Trip trip) {
    const ride::TripId id = nextId_++;
    ridersOnTrips_.insert(trip.rider());
    trips_.emplace(id, std::move(trip));
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
  bool riderIsBusy(const std::string& rider) const { return ridersOnTrips_.count(rider) > 0; }
  // Call once a trip has reached a final state.
  void close(const std::string& rider) { ridersOnTrips_.erase(rider); }

 private:
  std::map<ride::TripId, Trip> trips_;
  std::set<std::string> ridersOnTrips_;
  ride::TripId nextId_ = 1;
};
