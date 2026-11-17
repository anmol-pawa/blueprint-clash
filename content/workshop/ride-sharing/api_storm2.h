#pragma once
// Change Storm 2 lets a driver decline a trip. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace ride {

struct DeclineResult {
  Status status = Status::Ok;  // Ok: re-matched. NoDriverAvailable: the trip is now Cancelled.
  std::string driver;          // the new driver; empty unless status is Ok
};

class DecliningRides : public Rides {
 public:
  // The driver of a Matched trip turns it down. Checks in order: UnknownTrip, WrongParty, InvalidState (only a
  // Matched trip can be declined). The decliner is free again, online, where they were, and is never offered THIS
  // trip again. The trip is matched again at once, by the same rule as requestRide from the same pickup, among
  // the drivers who have not declined it: the new driver is returned and the trip stays Matched with the fare it
  // already had. If nobody qualifies the trip becomes Cancelled (no fee, the rider may request again) and the
  // status is NoDriverAvailable.
  virtual DeclineResult decline(TripId trip, const std::string& driver) = 0;
};

// Surge pricing as in Storm 1, plus decline().
std::unique_ptr<DecliningRides> makeDecliningRides();

}  // namespace ride
