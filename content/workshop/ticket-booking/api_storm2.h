#pragma once
// Change Storm 2 adds a per-user seat limit. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace tix {

// A user may never have more than `maxSeatsPerUser` seats in use in one show. A seat is in use for a user while it is
// Booked by them or covered by one of their live holds. A hold that expired, or was released, no longer counts.
// hold() and holdBest() return OverLimit, changing nothing, when seatsInUse + the seats requested would exceed the
// limit. For hold() the order of checks becomes UnknownShow, InvalidRequest, UnknownSeat, OverLimit, SeatUnavailable;
// for holdBest() it is UnknownShow, InvalidRequest, OverLimit, SeatUnavailable.
class LimitedBooking : public SmartBooking {
 public:
  virtual int seatsInUse(const std::string& show, const std::string& user) const = 0;
};

// Returns nullptr when the clock is null, holdTicks is zero or less, or maxSeatsPerUser is below one.
std::unique_ptr<LimitedBooking> makeLimitedBooking(std::shared_ptr<Clock> clock, long long holdTicks, int maxSeatsPerUser);

}  // namespace tix
