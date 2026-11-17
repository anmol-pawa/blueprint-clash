#pragma once
// Change Storm 1 adds surge pricing. Everything from api.h still holds.
#include "api.h"

namespace ride {

// Busy cities cost more. At the moment of requestRide(), BEFORE the new driver is taken, let
//   online = drivers who are online (free or on a trip), busy = drivers on a trip,
//   utilisation = busy * 100 / online   (integer division; there is always at least one online driver when a
//                                         match exists)
// The fare multiplier in percent is 100 when utilisation < 50, 150 when it is 50..79 and 200 when it is 80 or more.
//   fare = (kBaseFare + kFarePerBlock * distance) * multiplier / 100   (integer maths, rounded down once)
// The fare is fixed at request time and never changes afterwards. The late cancel fee is not multiplied.
std::unique_ptr<Rides> makeSurgeRides();

}  // namespace ride
