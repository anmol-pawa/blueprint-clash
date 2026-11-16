#pragma once
// Change Storm 2 adds simplified debts. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace split {

// A ledger that can say how the group could settle up with few payments.
//   - simplify() returns payments (from -> to) that, if everyone made them, would bring every balance to 0. It looks at
//     balances only (not at who originally owed whom) and does not change the ledger.
//   - The rule, so that the answer is exact: repeatedly take the member who owes the most (ties: the smaller id) and the
//     member who is owed the most (ties: the smaller id), and let the first pay the second the smaller of the two amounts.
//     Repeat until nobody owes anything. The payments are returned in the order they were found.
//   - This never needs more than (members with a non-zero balance - 1) payments. It is a good answer, not always the
//     smallest possible one (finding the minimum is NP-hard).
class SimplifyingLedger : public SplittingLedger {
 public:
  virtual std::vector<Debt> simplify() const = 0;
};

std::unique_ptr<SimplifyingLedger> makeSimplifyingLedger();

}  // namespace split
