#pragma once
// Change Storm 1 adds unequal splits. Everything from api.h still holds for the new ledger.
#include "api.h"

namespace split {

// "Whole" for a percentage: 10000 basis points = 100.00%.
constexpr long long kWhole = 10000;

enum class SplitKind {
  Equal,    // as addExpense: the values in the shares are ignored
  Exact,    // each share's value is its cents
  Percent,  // each share's value is its portion in basis points (2500 = 25.00%)
};

struct Share {
  std::string member;
  long long value = 0;
};

struct SplitSpec {
  SplitKind kind = SplitKind::Equal;
  std::vector<Share> shares;  // who takes part, in order, and (for Exact and Percent) how much
};

// A ledger that can split an expense in more ways than equally.
//   - addExpenseWith(payer, cents, spec) runs the same four checks as addExpense, in the same order, on the shares'
//     members, and then one more: BadSplit when
//       Exact:   any value is negative, or the values do not add up to `cents` exactly;
//       Percent: any value is negative or above kWhole, or the values do not add up to kWhole exactly.
//     Equal never gives BadSplit. A refused expense changes nothing.
//   - Percent: a member's portion is cents * value / kWhole rounded down; the cents left over (always fewer than the
//     number of shares) go one each to the members with the largest fractional remainder, a tie going to the one listed
//     first. The portions always add up to `cents`.
//   - Everything else (who owes whom, balances, settleUp) works as before. addExpense keeps working.
class SplitLedger : public Ledger {
 public:
  virtual Status addExpenseWith(const std::string& payer, long long cents, const SplitSpec& spec) = 0;
};

std::unique_ptr<SplitLedger> makeSplitLedger();

}  // namespace split
