#pragma once
// Change Storm 2 adds debt simplification. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace split {

// "from" should pay "to" this many cents.
struct Transfer {
  std::string from;
  std::string to;
  long long cents = 0;
};

// A ledger that can say how the group settles up with few payments.
//   - simplify() returns payments which, if every one were made with settleUp, would bring every balance to zero. It looks
//     only at the balances: who originally owed whom does not matter.
//   - The plan is built greedily: while somebody owes, the member with the largest debt (a tie goes to the name that
//     sorts first) pays the member with the largest credit (same tie rule) the smaller of the two amounts. Transfers are
//     returned in that order. Every transfer is for at least 1 cent; members with balance 0 never appear.
//   - It does not change the ledger. A group whose balances are all zero gets an empty plan.
class SimplifyingLedger : public SplitLedger {
 public:
  virtual std::vector<Transfer> simplify() const = 0;
};

std::unique_ptr<SimplifyingLedger> makeSimplifyingLedger();

}  // namespace split
