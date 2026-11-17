#pragma once
#include <map>
#include <memory>
#include <string>
#include <utility>

#include "api_storm2.h"
#include "cancel_fee.h"
#include "fare.h"
#include "matcher.h"
#include "roster.h"
#include "trip_machine.h"
#include "trips.h"

// Names the one failed-request shape so that no caller builds it by hand.
struct Refusal {
  static ride::RideResult of(ride::Status status) { return ride::RideResult{status, ride::kNoTrip, "", 0}; }
};

// The public face of the base game. It validates a request in the documented order and sequences the collaborators.
// It holds no rule of its own about distance, money, fees or which driver is chosen. `Iface` is the interface of the
// phase being served, so each Change Storm adds a thin layer below instead of growing this class.
template <class Iface>
class RideServiceImpl : public Iface {
 public:
  RideServiceImpl(std::unique_ptr<Matcher> matcher, std::unique_ptr<CancelFee> cancelFee)
      : matcher_(std::move(matcher)), cancelFee_(std::move(cancelFee)) {}

  bool addDriver(const std::string& driver, ride::Point at) override {
    return roster_.add(driver, at, ride::RideClass::Economy);
  }
  ride::Status goOffline(const std::string& driver) override {
    return roster_.transition(driver, ride::DriverState::Idle, ride::DriverState::Offline);
  }
  ride::Status goOnline(const std::string& driver) override {
    return roster_.transition(driver, ride::DriverState::Offline, ride::DriverState::Idle);
  }
  ride::RideResult requestRide(const std::string& rider, ride::Point from, ride::Point to) override {
    return match(rider, ride::RideClass::Economy, from, to);
  }

  ride::Status cancel(ride::TripId id, const std::string& rider) override {
    Trip* trip = trips_.find(id);
    if (trip == nullptr) return ride::Status::UnknownTrip;
    if (trip->rider != rider) return ride::Status::WrongParty;
    if (!TripMachine::allows(trip->state, Step::Cancel)) return ride::Status::WrongState;
    fees_[rider] += cancelFee_->charge(trip->arrived);
    trip->state = TripMachine::after(Step::Cancel);
    roster_.setState(trip->driver, ride::DriverState::Idle);
    return ride::Status::Ok;
  }

  ride::Status start(ride::TripId id, const std::string& driver) override {
    Trip* trip = trips_.find(id);
    if (trip == nullptr) return ride::Status::UnknownTrip;
    if (trip->driver != driver) return ride::Status::WrongParty;
    if (!TripMachine::allows(trip->state, Step::Start)) return ride::Status::WrongState;
    trip->state = TripMachine::after(Step::Start);
    roster_.moveTo(driver, trip->from);
    return ride::Status::Ok;
  }

  ride::CompleteResult complete(ride::TripId id, const std::string& driver) override {
    Trip* trip = trips_.find(id);
    if (trip == nullptr) return ride::CompleteResult{ride::Status::UnknownTrip, 0};
    if (trip->driver != driver) return ride::CompleteResult{ride::Status::WrongParty, 0};
    if (!TripMachine::allows(trip->state, Step::Complete)) return ride::CompleteResult{ride::Status::WrongState, 0};
    trip->state = TripMachine::after(Step::Complete);
    roster_.moveTo(driver, trip->to);
    roster_.setState(driver, ride::DriverState::Idle);
    return ride::CompleteResult{ride::Status::Ok, trip->fare};
  }

  ride::TripState tripState(ride::TripId id) const override {
    const Trip* trip = trips_.find(id);
    return trip == nullptr ? ride::TripState::None : trip->state;
  }
  ride::DriverState driverState(const std::string& driver) const override { return roster_.state(driver); }
  std::optional<ride::Point> driverLocation(const std::string& driver) const override { return roster_.where(driver); }

 protected:
  // The one place a ride is matched, whatever the class. Checks in the documented order, then one change of state.
  ride::RideResult match(const std::string& rider, ride::RideClass rideClass, const ride::Point& from,
                         const ride::Point& to) {
    if (rider.empty() || !Grid::contains(from) || !Grid::contains(to) || Grid::same(from, to)) {
      return Refusal::of(ride::Status::InvalidRequest);
    }
    if (trips_.hasActive(rider)) return Refusal::of(ride::Status::RiderBusy);
    const auto candidates = roster_.idleNear(from, rideClass, ride::kMaxPickupDistance);
    if (candidates.empty()) return Refusal::of(ride::Status::NoDriverNearby);
    const std::string driver = matcher_->choose(candidates);
    const ride::Money fare = Fare::quote(from, to, rideClass);
    const ride::TripId id = trips_.add(Trip{rider, driver, from, to, fare, ride::TripState::Matched, false});
    roster_.setState(driver, ride::DriverState::Busy);
    return ride::RideResult{ride::Status::Ok, id, driver, fare};
  }

  Roster roster_;
  Trips trips_;
  std::map<std::string, ride::Money> fees_;

 private:
  std::unique_ptr<Matcher> matcher_;
  std::unique_ptr<CancelFee> cancelFee_;
};

// Storm 1: classes. Adds the two class-aware calls on top of the base game and nothing else.
template <class Iface>
class ClassedServiceImpl : public RideServiceImpl<Iface> {
 public:
  using RideServiceImpl<Iface>::RideServiceImpl;

  bool addDriverOf(const std::string& driver, ride::Point at, ride::RideClass rideClass) override {
    return this->roster_.add(driver, at, rideClass);
  }
  ride::RideResult requestRideOf(const std::string& rider, ride::RideClass rideClass, ride::Point from,
                                 ride::Point to) override {
    return this->match(rider, rideClass, from, to);
  }
};

// Storm 2: arrival and cancellation fees. Adds `arrive` and two queries; the fee itself is the CancelFee Strategy.
class FeeServiceImpl : public ClassedServiceImpl<ride::FeeService> {
 public:
  using ClassedServiceImpl<ride::FeeService>::ClassedServiceImpl;

  ride::Status arrive(ride::TripId id, const std::string& driver) override {
    Trip* trip = trips_.find(id);
    if (trip == nullptr) return ride::Status::UnknownTrip;
    if (trip->driver != driver) return ride::Status::WrongParty;
    if (!TripMachine::allows(trip->state, Step::Arrive) || trip->arrived) return ride::Status::WrongState;
    trip->arrived = true;
    return ride::Status::Ok;
  }
  bool isArrived(ride::TripId id) const override {
    const Trip* trip = trips_.find(id);
    return trip != nullptr && trip->state == ride::TripState::Matched && trip->arrived;
  }
  ride::Money feesOwed(const std::string& rider) const override {
    const auto it = fees_.find(rider);
    return it == fees_.end() ? 0 : it->second;
  }
};
