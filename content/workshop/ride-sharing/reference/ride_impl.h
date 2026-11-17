#pragma once
#include <memory>
#include <string>
#include <utility>

#include "api.h"
#include "driver_pool.h"
#include "geometry.h"
#include "matcher.h"
#include "pricing.h"
#include "trip.h"
#include "trip_book.h"

// Looks up a trip and checks that the caller is its driver (or its rider). Both answer UnknownTrip, then WrongParty.
inline ride::Status driversTrip(TripBook& book, ride::TripId id, const std::string& driver, Trip** out) {
  *out = book.find(id);
  if (*out == nullptr) return ride::Status::UnknownTrip;
  return (*out)->driver() == driver ? ride::Status::Ok : ride::Status::WrongParty;
}
inline ride::Status ridersTrip(TripBook& book, ride::TripId id, const std::string& rider, Trip** out) {
  *out = book.find(id);
  if (*out == nullptr) return ride::Status::UnknownTrip;
  return (*out)->rider() == rider ? ride::Status::Ok : ride::Status::WrongParty;
}

// The facade: validates in the documented order and sequences the collaborators. Distance, fares, surge, matching
// and the legal order of trip states each live in one class of their own.
class RideImpl : public ride::Dispatch {
 public:
  RideImpl(std::unique_ptr<DriverMatcher> matcher, std::unique_ptr<SurgePolicy> surge)
      : matcher_(std::move(matcher)), surge_(std::move(surge)) {}

  bool addDriver(const std::string& driver) override { return drivers_.add(driver); }

  ride::Status goOnline(const std::string& driver, ride::Location where) override {
    if (drivers_.state(driver) == ride::DriverState::Unknown) return ride::Status::UnknownDriver;
    if (!Grid::contains(where)) return ride::Status::InvalidRequest;
    if (drivers_.state(driver) == ride::DriverState::OnTrip) return ride::Status::DriverBusy;
    drivers_.setAvailable(driver, where);
    return ride::Status::Ok;
  }

  ride::Status goOffline(const std::string& driver) override {
    if (drivers_.state(driver) == ride::DriverState::Unknown) return ride::Status::UnknownDriver;
    if (drivers_.state(driver) == ride::DriverState::OnTrip) return ride::Status::DriverBusy;
    drivers_.setOffline(driver);
    return ride::Status::Ok;
  }

  ride::DriverState driverState(const std::string& driver) const override { return drivers_.state(driver); }

  ride::RequestResult requestRide(const std::string& rider, ride::Location pickup, ride::Location dropoff) override {
    ride::RequestResult result;
    if (rider.empty() || !Grid::contains(pickup) || !Grid::contains(dropoff) || Grid::sameSpot(pickup, dropoff)) {
      result.status = ride::Status::InvalidRequest;
      return result;
    }
    if (trips_.riderIsBusy(rider)) {
      result.status = ride::Status::RiderBusy;
      return result;
    }
    const int surgePercent = surge_->percentFor(drivers_.availableCount());
    const auto candidates = drivers_.availableWithin(pickup, matcher_->reach());
    const int chosen = matcher_->choose(candidates);
    if (chosen < 0) {
      result.status = ride::Status::NoDriver;
      return result;
    }
    const std::string& driver = candidates[chosen].id;
    const ride::Money fare = Tariff::fare(Grid::distance(pickup, dropoff), surgePercent);
    drivers_.setOnTrip(driver);
    result.trip = trips_.open(Trip(rider, driver, pickup, dropoff, fare));
    result.driver = driver;
    result.fare = fare;
    return result;
  }

  ride::Status driverArrived(ride::TripId id, const std::string& driver) override {
    Trip* trip = nullptr;
    const ride::Status check = driversTrip(trips_, id, driver, &trip);
    if (check != ride::Status::Ok) return check;
    if (!trip->arrive()) return ride::Status::BadState;
    drivers_.moveTo(driver, trip->pickup());
    return ride::Status::Ok;
  }

  ride::Status startTrip(ride::TripId id, const std::string& driver) override {
    Trip* trip = nullptr;
    const ride::Status check = driversTrip(trips_, id, driver, &trip);
    if (check != ride::Status::Ok) return check;
    return trip->start() ? ride::Status::Ok : ride::Status::BadState;
  }

  ride::CompleteResult completeTrip(ride::TripId id, const std::string& driver) override {
    ride::CompleteResult result;
    Trip* trip = nullptr;
    result.status = driversTrip(trips_, id, driver, &trip);
    if (result.status != ride::Status::Ok) return result;
    if (!trip->complete()) {
      result.status = ride::Status::BadState;
      return result;
    }
    drivers_.setAvailable(driver, trip->dropoff());
    trips_.close(trip->rider());
    result.fare = trip->fare();
    return result;
  }

  ride::Status cancel(ride::TripId id, const std::string& rider) override {
    Trip* trip = nullptr;
    const ride::Status check = ridersTrip(trips_, id, rider, &trip);
    if (check != ride::Status::Ok) return check;
    if (!trip->cancel()) return ride::Status::BadState;
    drivers_.setAvailable(trip->driver(), drivers_.where(trip->driver()));
    trips_.close(rider);
    return ride::Status::Ok;
  }

  ride::Status rate(ride::TripId id, const std::string& rider, int stars) override {
    Trip* trip = nullptr;
    const ride::Status check = ridersTrip(trips_, id, rider, &trip);
    if (check != ride::Status::Ok) return check;
    if (stars < ride::kMinStars || stars > ride::kMaxStars) return ride::Status::InvalidRequest;
    if (trip->state() != ride::TripState::Completed) return ride::Status::BadState;
    if (!trip->markRated()) return ride::Status::AlreadyRated;
    drivers_.addRating(trip->driver(), stars);
    return ride::Status::Ok;
  }

  long long rating(const std::string& driver) const override { return drivers_.ratingHundredths(driver); }

  ride::TripState state(ride::TripId id) const override {
    const Trip* trip = trips_.find(id);
    return trip == nullptr ? ride::TripState::Unknown : trip->state();
  }

 private:
  DriverPool drivers_;
  TripBook trips_;
  std::unique_ptr<DriverMatcher> matcher_;
  std::unique_ptr<SurgePolicy> surge_;
};
