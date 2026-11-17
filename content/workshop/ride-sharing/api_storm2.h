#pragma once
// Change Storm 2 adds an Arrived step and cancellation fees. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace ride {

constexpr Money kMaxCancelFee = 100000;

// A trip can now be Arrived: the driver is waiting at the pickup point. Matched -> Arrived -> InProgress.
// Cancelling a Matched trip is free, as before. Cancelling an Arrived trip is allowed and adds `cancelFee` to what
// the rider owes. `start` works from Matched and from Arrived (a driver who never taps "arrived" still works), and
// `complete` is unchanged. While a trip is Arrived, tripState() still reports Matched (the enum is the base game's);
// isArrived() tells the two apart. The driver is Busy throughout.

class FeeService : public ClassedService {
 public:
  // Matched -> Arrived. Failures, in this order: UnknownTrip, WrongParty (not the matched driver), WrongState.
  virtual Status arrive(TripId trip, const std::string& driver) = 0;

  // True when the trip is Matched and the driver has arrived.
  virtual bool isArrived(TripId trip) const = 0;

  // What the rider owes for cancelled trips so far, in cents. 0 for a rider who never cancelled an arrived trip.
  virtual Money feesOwed(const std::string& rider) const = 0;
};

// Returns nullptr when cancelFee is negative or above kMaxCancelFee.
std::unique_ptr<FeeService> makeFeeService(Money cancelFee);

}  // namespace ride
