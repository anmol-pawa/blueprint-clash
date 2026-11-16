#pragma once
// Change Storm 1 adds richer ways to split one expense. Everything from api.h still holds for the new ledger.
#include "api.h"

namespace split {

enum class SplitKind {
  Equal,    // as addExpense: `value` is ignored
  Exact,    // value = the cents this member owes; all >= 0 and they add up to the amount
  Percent,  // value = basis points (10000 = 100%); all >= 0 and they add up to exactly 10000
  Shares,   // value = a weight (2 means twice the share of 1); all > 0
};

struct Part {
  std::string member;
  long long value = 0;
};

struct SplitSpec {
  SplitKind kind = SplitKind::Equal;
  std::vector<Part> parts;  // the participants, in listed order
};

// A ledger that understands several kinds of split.
//   - addExpenseSplit(payer, cents, spec) checks in this order: cents <= 0 -> InvalidAmount; no parts -> NoParticipants;
//     unknown payer, then unknown part member -> UnknownMember; a member twice -> DuplicateParticipant; numbers that do not
//     fit the kind (see SplitKind) -> BadSplit. A refused expense changes nothing.
//   - Exact: each member owes exactly their value (zero is allowed).
//   - Percent and Shares are proportional: member i owes cents * value_i / total_value rounded down, and the cents left over
//     go one each to the members with the largest fractional remainder (the part that was rounded away), ties to the member
//     listed first. (Equal is the same rule with every weight 1, so the leftover goes to the first listed.)
//   - As in addExpense, the payer owes themselves nothing, whether or not they are listed.
// addExpense and everything else keep working as in api.h.
class SplittingLedger : public Ledger {
 public:
  virtual Status addExpenseSplit(const std::string& payer, long long cents, const SplitSpec& spec) = 0;
};

std::unique_ptr<SplittingLedger> makeSplittingLedger();

}  // namespace split
