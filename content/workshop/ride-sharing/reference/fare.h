#pragma once
#include "api_storm1.h"
#include "geometry.h"

// Prices a trip: the base-game fare scaled by the ride class, with one integer division at the end.
class Fare {
 public:
  static ride::Money quote(const ride::Point& from, const ride::Point& to, ride::RideClass rideClass) {
    const ride::Money raw = ride::kBaseFare + ride::kFarePerUnit * Grid::distance(from, to);
    return raw * percentOf(rideClass) / 100;
  }

 private:
  static int percentOf(ride::RideClass rideClass) {
    switch (rideClass) {
      case ride::RideClass::Economy: return 100;
      case ride::RideClass::Comfort: return 140;
      case ride::RideClass::Xl: return 200;
    }
    return 100;
  }
};
