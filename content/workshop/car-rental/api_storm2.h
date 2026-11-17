#pragma once
// Change Storm 2 rotates the fleet. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace rental {

// pickUp() now hands over the free car that has been IDLE the longest, to even out wear. A car that has never been
// rented counts as having been idle forever; among those, and among cars returned in the same hour, the lowest plate
// goes first. "Idle since" is the hour of the car's last returnCar(). Everything else, including the late fee of
// makeLateFeeRentals (same arguments and rules), behaves as before.
//
// Returns nullptr in the same cases as makeLateFeeRentals.
std::unique_ptr<Rentals> makeRotatingRentals(std::shared_ptr<Clock> clock, int graceHours, int percentPerHour);

}  // namespace rental
