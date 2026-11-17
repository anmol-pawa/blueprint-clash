#pragma once
// Change Storm 1 adds late fees. Everything from api.h still holds.
#include "api.h"

namespace rental {

// A car that comes back after its drop-off hour costs extra. With lateHours = now - dropoff at the moment of
// returnCar(), the billable hours are max(0, lateHours - graceHours), and
//   charge = total + dailyRate * billableHours * percentPerHour / 100   (integer maths, rounded down once),
// where dailyRate is the category's rate and total is what the reservation was given. A car returned on time or early
// is charged exactly the total. The fee does not change what reserve() returns, only what returnCar() charges.
//
// Returns nullptr when the clock is null, graceHours is negative or percentPerHour is outside 0..1000.
std::unique_ptr<Rentals> makeLateFeeRentals(std::shared_ptr<Clock> clock, int graceHours, int percentPerHour);

}  // namespace rental
