#pragma once
// Change Storm 1 adds seasonal prices. Everything from api.h still holds.
#include "api.h"

namespace hotel {

class SeasonalHotel : public Hotel {
 public:
  // From now on the nights fromDay, fromDay+1, ..., toDay-1 of the room type cost `nightlyRate` instead of the
  // normal rate. Where seasons overlap, the one added LAST wins on the nights they share. Returns false, changing
  // nothing, for an unknown type, toDay <= fromDay, or a rate outside 1..kMaxNightlyRate. A season may be any length
  // and cover any days. A reservation already made keeps the total it was given; only later bookings and quotes
  // see the new season.
  virtual bool addSeason(const std::string& type, long long fromDay, long long toDay, Money nightlyRate) = 0;

  // What booking this stay would cost right now, whether or not it is available and whether or not it is in the
  // past. Empty for an unknown type or a stay that is not valid (as in api.h). book() charges exactly this.
  virtual std::optional<Money> quote(const std::string& type, long long checkIn, long long checkOut) const = 0;
};

// Returns nullptr when the clock is null.
std::unique_ptr<SeasonalHotel> makeSeasonalHotel(std::shared_ptr<Clock> clock);

}  // namespace hotel
