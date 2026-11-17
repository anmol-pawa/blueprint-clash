#pragma once
// Change Storm 1 lets a customer ask for more time. Everything from api.h still holds.
#include "api.h"

namespace booking {

enum class ExtendResult { Ok, UnknownHold, NotOwner, Expired, AlreadyExtended };

class ExtendableService : public BookingService {
 public:
  // Gives a live hold a fresh full period counted from now: it stays live while now() < thisTick + holdTicks. This
  // replaces the old deadline (it is not added to it): asking late gives a later deadline than asking early. A hold can be extended once. Checked in order, the first failure wins:
  //   UnknownHold      never issued, or already confirmed or released
  //   NotOwner         `user` did not make the hold
  //   Expired          the hold has lapsed; it cannot be revived
  //   AlreadyExtended  this hold was extended before
  virtual ExtendResult extend(HoldId hold, const std::string& user) = 0;
};

// Returns nullptr when the clock is null or holdTicks is not positive.
std::unique_ptr<ExtendableService> makeExtendableService(std::shared_ptr<Clock> clock, long long holdTicks);

}  // namespace booking
