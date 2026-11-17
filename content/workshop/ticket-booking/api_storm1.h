#pragma once
// Change Storm 1 adds "pick the best seats for me". Everything from api.h still holds.
#include "api.h"

namespace tix {

class SmartBooking : public Booking {
 public:
  // Holds `count` seats side by side in one row, chosen by the house rule below, for the user. The held seats are
  // returned left to right. Checks, in order: UnknownShow, InvalidRequest (empty user or count below one),
  // SeatUnavailable when no row has `count` free seats in a run. Nothing changes on failure.
  //
  // House rule: among all runs of `count` adjacent free seats in one row, take the one that minimises, in this order:
  //   1. the distance of its row from the middle of the hall, |2*row - (rows-1)|  (row 0 is A);
  //   2. the distance of the run's centre from the middle of the row, |2*firstSeat + (count-1) - (seatsPerRow-1)|
  //      (firstSeat counts from 0);
  //   3. the row index, lower first;
  //   4. the first seat index, lower first.
  virtual HoldResult holdBest(const std::string& show, const std::string& user, int count) = 0;
};

// Returns nullptr when the clock is null or holdTicks is zero or less.
std::unique_ptr<SmartBooking> makeSmartBooking(std::shared_ptr<Clock> clock, long long holdTicks);

}  // namespace tix
