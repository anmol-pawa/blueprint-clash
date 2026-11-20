#pragma once
// Change Storm 1: commissions.
#include "api.h"

namespace broker {

// What one trade costs in commission, in cents, from the trade's VALUE (shares x quote):
//   fee = max(minimum, flat + ceil(value x basisPoints / 10000)).     (ceil: a part of a cent is a whole cent)
// The all-zero schedule is "no commission", which is exactly makeBrokerage().
struct FeeSchedule {
  long long flat = 0;
  int basisPoints = 0;  // 1 basis point = 0.01 percent
  long long minimum = 0;
};

class FeeBrokerage : public Brokerage {
 public:
  // The commission is charged on every buy and every sell, the same schedule for both.
  //  - buy: the cash must cover value + fee (else InsufficientFunds). The fee becomes part of the new lot's COST.
  //  - sell: the fee is taken out of the proceeds, so the cash gets value - fee. A sale whose fee is more than its value is
  //    refused with InsufficientFunds (checked after InsufficientShares). Realized P&L is (value - fee) minus the cost of the
  //    consumed shares, where a PARTLY consumed lot gives up cost x consumed / lotShares, rounded down, and the lot that is
  //    used up completely gives up whatever cost it has left (so no cent is lost or invented).
  // feesPaid() is the account's total commission so far (InvalidInput, then UnknownAccount; touched only on Ok).
  virtual Status feesPaid(int id, long long& out) const = 0;
};

std::unique_ptr<FeeBrokerage> makeFeeBrokerage(const FeeSchedule& schedule);

}  // namespace broker
