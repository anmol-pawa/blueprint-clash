#pragma once
#include <string>
#include <utility>

#include "api.h"

// One trip and its state machine. Every legal move is a method here; an illegal one returns false and changes
// nothing, so no other class needs to know the order of the states.
class Trip {
 public:
  Trip(std::string rider, std::string driver, ride::Location pickup, ride::Location dropoff, ride::Money fare)
      : rider_(std::move(rider)), driver_(std::move(driver)), pickup_(pickup), dropoff_(dropoff), fare_(fare) {}

  const std::string& rider() const { return rider_; }
  const std::string& driver() const { return driver_; }
  const ride::Location& pickup() const { return pickup_; }
  const ride::Location& dropoff() const { return dropoff_; }
  ride::Money fare() const { return fare_; }
  ride::TripState state() const { return state_; }

  bool arrive() { return move(ride::TripState::Matched, ride::TripState::DriverArrived); }
  bool start() { return move(ride::TripState::DriverArrived, ride::TripState::InProgress); }
  bool complete() { return move(ride::TripState::InProgress, ride::TripState::Completed); }
  bool cancel() {
    return move(ride::TripState::Matched, ride::TripState::Cancelled) ||
           move(ride::TripState::DriverArrived, ride::TripState::Cancelled);
  }
  bool markRated() {
    if (state_ != ride::TripState::Completed || rated_) return false;
    rated_ = true;
    return true;
  }

 private:
  bool move(ride::TripState from, ride::TripState to) {
    if (state_ != from) return false;
    state_ = to;
    return true;
  }

  std::string rider_;
  std::string driver_;
  ride::Location pickup_;
  ride::Location dropoff_;
  ride::Money fare_;
  ride::TripState state_ = ride::TripState::Matched;
  bool rated_ = false;
};
