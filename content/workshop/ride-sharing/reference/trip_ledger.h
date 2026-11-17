#pragma once
#include <map>
#include <set>
#include <string>
#include <utility>

#include "grid.h"

// One trip, as a record. It has no behaviour: the rules about moving between states are in TripLifecycle.
struct Trip {
  std::string rider;
  std::string driver;
  ride::Point pickup;
  ride::Point dropoff;
  ride::Money fare;
  ride::TripState state;
  std::set<std::string> declinedBy;
};

// The state machine, written once as a table of legal moves.
class TripLifecycle {
 public:
  static bool allows(ride::TripState from, ride::TripState to) {
    using ride::TripState;
    static const std::set<std::pair<TripState, TripState>> moves = {
        {TripState::Matched, TripState::Arrived},    {TripState::Matched, TripState::Cancelled},
        {TripState::Arrived, TripState::InProgress}, {TripState::Arrived, TripState::Cancelled},
        {TripState::InProgress, TripState::Completed},
    };
    return moves.count({from, to}) > 0;
  }

  // A trip that has not ended: its driver is busy and its rider may not ask for another.
  static bool isOpen(ride::TripState state) {
    return state == ride::TripState::Matched || state == ride::TripState::Arrived ||
           state == ride::TripState::InProgress;
  }

  static bool canBeDeclined(ride::TripState state) { return state == ride::TripState::Matched; }
};

// Issues ids and keeps every trip for good, so a finished trip can still be told apart from one that never existed.
class TripLedger {
 public:
  ride::TripId open(Trip trip) {
    const ride::TripId id = nextId_++;
    trips_.emplace(id, std::move(trip));
    return id;
  }

  Trip* find(ride::TripId id) {
    const auto found = trips_.find(id);
    return found == trips_.end() ? nullptr : &found->second;
  }

  const Trip* find(ride::TripId id) const {
    const auto found = trips_.find(id);
    return found == trips_.end() ? nullptr : &found->second;
  }

  bool riderIsTravelling(const std::string& rider) const {
    for (const auto& [id, trip] : trips_) {
      if (trip.rider == rider && TripLifecycle::isOpen(trip.state)) return true;
    }
    return false;
  }

 private:
  ride::TripId nextId_ = 1;
  std::map<ride::TripId, Trip> trips_;
};
