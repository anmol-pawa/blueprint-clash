#pragma once
// Change Storm 2 matches by rating. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace ride {

// Matching now considers only available drivers within `radius` of the pickup (not kMaxPickupDistance), and picks
// the one with the HIGHEST average rating; ties go to the nearer driver, then to the lowest driver id. Ratings are
// compared exactly (as fractions, not as the rounded hundredths of rating()); a driver with no ratings counts as
// kDefaultStars. No driver within the radius is NoDriver, even if a farther one is free. Surge pricing works as in
// makeSurgeDispatch (same arguments and rules).
//
// Returns nullptr when the surge arguments are invalid (as in makeSurgeDispatch) or radius is outside
// 1..kMaxPickupDistance.
std::unique_ptr<Dispatch> makeRatedDispatch(int freeDriverThreshold, int surgePercent, long long radius);

}  // namespace ride
