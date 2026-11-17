#pragma once
// Change Storm 1 adds ride classes. Everything from api.h still holds.
#include "api.h"

namespace ride {

enum class RideClass { Economy, Comfort, Xl };

// Every driver offers exactly one class, and a ride of a class is matched only with idle drivers of that class.
// The fare is the base-game fare times a percentage by class: Economy 100, Comfort 140, Xl 200 (percent of
// kBaseFare + kFarePerUnit * distance). The drivers and rides of api.h are Economy.
class ClassedService : public RideService {
 public:
  // As addDriver, for a driver of the given class.
  virtual bool addDriverOf(const std::string& driver, Point at, RideClass rideClass) = 0;

  // As requestRide, but only drivers of `rideClass` are considered. The documented checks, the nearest-driver rule and
  // its ties are unchanged. NoDriverNearby means no idle driver OF THAT CLASS is within range.
  virtual RideResult requestRideOf(const std::string& rider, RideClass rideClass, Point from, Point to) = 0;
};

std::unique_ptr<ClassedService> makeClassedService();

}  // namespace ride
