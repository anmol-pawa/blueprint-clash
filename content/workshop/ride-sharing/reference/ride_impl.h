#pragma once
#include <memory>
#include <optional>
#include <string>
#include <utility>

#include "fare_policy.h"
#include "matcher.h"
#include "roster.h"
#include "trip_ledger.h"

// The public face. It validates in the documented order and sequences the roster, the matcher, the fare policy and
// the ledger. Which driver is chosen, what a trip costs and which moves are legal are decided by those classes.
class RidesImpl : public ride::DecliningRides {
 public:
  RidesImpl(std::unique_ptr<Matcher> matcher, std::unique_ptr<FarePolicy> fares)
      : matcher_(std::move(matcher)), fares_(std::move(fares)) {}

  bool registerDriver(const std::string& driver, ride::Point at) override { return roster_.add(driver, at); }

  ride::Status goOnline(const std::string& driver) override {
    if (!roster_.knows(driver)) return ride::Status::UnknownDriver;
    roster_.setOnline(driver, true);
    return ride::Status::Ok;
  }

  ride::Status goOffline(const std::string& driver) override {
    if (!roster_.knows(driver)) return ride::Status::UnknownDriver;
    if (roster_.isBusy(driver)) return ride::Status::DriverBusy;
    roster_.setOnline(driver, false);
    return ride::Status::Ok;
  }

  ride::Status moveDriver(const std::string& driver, ride::Point to) override {
    if (!roster_.knows(driver)) return ride::Status::UnknownDriver;
    if (!Grid::onTheMap(to)) return ride::Status::InvalidRequest;
    roster_.moveTo(driver, to);
    return ride::Status::Ok;
  }

  ride::RequestResult requestRide(const std::string& rider, ride::Point pickup, ride::Point dropoff) override {
    if (rider.empty() || !Grid::onTheMap(pickup) || !Grid::onTheMap(dropoff) || Grid::samePlace(pickup, dropoff)) {
      return ride::RequestResult{ride::Status::InvalidRequest};
    }
    if (ledger_.riderIsTravelling(rider)) return ride::RequestResult{ride::Status::InvalidState};
    const std::optional<std::string> driver = pickFree(*matcher_, roster_, pickup, {});
    if (!driver) return ride::RequestResult{ride::Status::NoDriverAvailable};
    // The market is read before this trip takes a driver out of it.
    const ride::Money fare = fares_->quote(Grid::blocksBetween(pickup, dropoff), Demand{roster_.onlineCount(), roster_.busyCount()});
    roster_.setBusy(*driver, true);
    const ride::TripId id = ledger_.open(Trip{rider, *driver, pickup, dropoff, fare, ride::TripState::Matched, {}});
    return ride::RequestResult{ride::Status::Ok, id, *driver, fare};
  }

  ride::Status arrived(ride::TripId id, const std::string& driver) override {
    return ledger_.advance(id, driver, ride::TripState::Arrived);
  }

  ride::Status start(ride::TripId id, const std::string& driver) override {
    return ledger_.advance(id, driver, ride::TripState::InProgress);
  }

  ride::CompleteResult complete(ride::TripId id, const std::string& driver) override {
    const ride::Status status = ledger_.advance(id, driver, ride::TripState::Completed);
    if (status != ride::Status::Ok) return ride::CompleteResult{status};
    const Trip& trip = *ledger_.find(id);
    roster_.setBusy(driver, false);
    roster_.moveTo(driver, trip.dropoff);
    return ride::CompleteResult{ride::Status::Ok, trip.fare};
  }

  ride::CancelResult cancel(ride::TripId id, const std::string& rider) override {
    Trip* trip = ledger_.find(id);
    if (trip == nullptr) return ride::CancelResult{ride::Status::UnknownTrip};
    if (trip->rider != rider) return ride::CancelResult{ride::Status::WrongParty};
    if (!TripLifecycle::allows(trip->state, ride::TripState::Cancelled)) return ride::CancelResult{ride::Status::InvalidState};
    const ride::Money fee = trip->state == ride::TripState::Arrived ? ride::kLateCancelFee : 0;
    trip->state = ride::TripState::Cancelled;
    roster_.setBusy(trip->driver, false);
    return ride::CancelResult{ride::Status::Ok, fee};
  }

  ride::DeclineResult decline(ride::TripId id, const std::string& driver) override {
    Trip* trip = ledger_.find(id);
    if (trip == nullptr) return ride::DeclineResult{ride::Status::UnknownTrip};
    if (trip->driver != driver) return ride::DeclineResult{ride::Status::WrongParty};
    if (!TripLifecycle::canBeDeclined(trip->state)) return ride::DeclineResult{ride::Status::InvalidState};
    trip->declinedBy.insert(driver);
    roster_.setBusy(driver, false);
    const std::optional<std::string> next = pickFree(*matcher_, roster_, trip->pickup, trip->declinedBy);
    if (!next) {
      trip->state = ride::TripState::Cancelled;
      return ride::DeclineResult{ride::Status::NoDriverAvailable};
    }
    trip->driver = *next;
    roster_.setBusy(*next, true);
    return ride::DeclineResult{ride::Status::Ok, *next};
  }

  ride::TripInfo trip(ride::TripId id) const override {
    const Trip* found = ledger_.find(id);
    if (found == nullptr) return ride::TripInfo{ride::Status::UnknownTrip};
    return ride::TripInfo{ride::Status::Ok, found->state, found->rider, found->driver, found->fare};
  }

  ride::DriverInfo driver(const std::string& driver) const override {
    if (!roster_.knows(driver)) return ride::DriverInfo{ride::Status::UnknownDriver};
    return ride::DriverInfo{ride::Status::Ok, roster_.isOnline(driver), roster_.isBusy(driver), roster_.position(driver)};
  }

 private:
  std::unique_ptr<Matcher> matcher_;
  std::unique_ptr<FarePolicy> fares_;
  DriverRoster roster_;
  TripLedger ledger_;
};
