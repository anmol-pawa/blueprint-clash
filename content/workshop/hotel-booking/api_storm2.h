#pragma once
// Change Storm 2 adds cancellation refunds. Everything from api.h and api_storm1.h still holds.
#include <vector>

#include "api_storm1.h"

namespace hotel {

// "If the guest cancels at least `daysBefore` days before check-in, they get `percent` percent of the total back."
struct RefundTier {
  int daysBefore;
  int percent;
};

struct CancelResult {
  Status status = Status::Ok;
  Money refund = 0;  // 0 unless status is Ok
};

// The days before check-in are checkIn - today(), measured when the guest cancels. The tier that applies is the one
// with the LARGEST daysBefore that is still <= that number; the tiers may be given in any order. When no tier
// applies the refund is 0. The refund is a percentage of the total the reservation was given when it was booked
// (not of today's prices), rounded down to whole cents. cancel() of api.h behaves exactly like cancelWithRefund()
// and drops the refund. A stay that has started cannot be cancelled, whatever the tiers say.
class RefundingHotel : public SeasonalHotel {
 public:
  virtual CancelResult cancelWithRefund(ReservationId id, const std::string& guest) = 0;
};

// Returns nullptr when the clock is null, a percent is outside 0..100, a daysBefore is negative, or two tiers share
// a daysBefore. An empty tier list is fine: nothing is ever refunded.
std::unique_ptr<RefundingHotel> makeRefundingHotel(std::shared_ptr<Clock> clock, std::vector<RefundTier> tiers);

}  // namespace hotel
