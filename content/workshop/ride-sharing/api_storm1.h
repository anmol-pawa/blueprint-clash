#pragma once
// Change Storm 1 adds surge pricing. Everything from api.h still holds.
#include "api.h"

namespace ride {

// When a ride is requested, count the drivers who are Available at that moment (before matching, everywhere on the
// grid). If that count is AT MOST `freeDriverThreshold`, the fare is multiplied by surgePercent / 100, in integer
// maths rounded down once, over the whole fare: (kBaseFare + kFarePerUnit * distance) * surgePercent / 100.
// Otherwise the fare is as in api.h. The multiplier is fixed in the trip at request time: the fare quoted in
// requestRide() is the fare completeTrip() returns, whatever happens to the supply in between.
//
// Returns nullptr when freeDriverThreshold is negative or surgePercent is outside 100..500.
std::unique_ptr<Dispatch> makeSurgeDispatch(int freeDriverThreshold, int surgePercent);

}  // namespace ride
