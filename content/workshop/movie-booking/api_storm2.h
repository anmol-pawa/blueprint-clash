#pragma once
// Change Storm 2 adds "give me the best seats". Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace booking {

class SeatingService : public ExtendableService {
 public:
  // Holds `count` seats next to each other in one row, chosen by the house rule: the lowest row that has such a run
  // wins, and inside it the run that starts at the lowest seat number. A run never continues from the end of one row
  // into the start of the next. Same checks as hold(), in this order: UnknownShow, then BadSeat when count < 1, then
  // TooManySeats when count > kMaxSeatsPerHold, then SeatTaken when no row has a run of free seats that long.
  // The result is an ordinary hold: confirm, release, extend and expiry treat it like any other.
  virtual HoldResult holdBest(const std::string& show, const std::string& user, int count) = 0;

  // The seats of a live hold in ascending order; empty when the hold is unknown, spent or lapsed.
  virtual std::vector<int> seatsOf(HoldId hold) const = 0;
};

// Returns nullptr when the clock is null or holdTicks is not positive.
std::unique_ptr<SeatingService> makeSeatingService(std::shared_ptr<Clock> clock, long long holdTicks);

}  // namespace booking
