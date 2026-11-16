#pragma once
// Public API for the Expense sharing problem. The hidden tests only use what is declared here.
// You implement split::makeLedger() (in any of your .cpp files); everything behind it is your design.
// Money is always a whole number of cents (long long). Nothing here throws: this code is compiled without exceptions.
#include <memory>
#include <string>
#include <vector>

namespace split {

enum class Status {
  Ok,
  InvalidAmount,         // an amount that is zero or negative
  NoParticipants,        // nobody to split between
  UnknownMember,         // a name that was never added
  DuplicateParticipant,  // the same member listed twice in one expense
  SamePerson,            // a payment from a member to themselves
  BadSplit,              // the numbers of a split do not describe a valid split of the amount
};

// `from` owes `to` this many cents. Always positive.
struct Debt {
  std::string from;
  std::string to;
  long long cents = 0;
};

class Ledger {
 public:
  virtual ~Ledger() = default;

  // Adds a person to the group. Returns false (and changes nothing) for an empty id or one that already exists.
  virtual bool addMember(const std::string& id) = 0;

  // `payer` paid `cents` for something that is shared equally between `participants` (listed in this order). The payer
  // need not be a participant. Every participant owes their share to the payer; the payer owes themselves nothing.
  // Whole cents only: each participant owes cents / n rounded down, and the cents left over (cents % n of them) go one
  // each to the first participants in the listed order.
  // The checks run in this order and the first failure decides; a refused expense changes nothing:
  //   1. cents <= 0                      -> InvalidAmount
  //   2. no participants                 -> NoParticipants
  //   3. an unknown payer, then an unknown participant (in listed order) -> UnknownMember
  //   4. a participant listed twice      -> DuplicateParticipant
  virtual Status addExpense(const std::string& payer, long long cents, const std::vector<std::string>& participants) = 0;

  // `from` pays `to` `cents` to settle up. This lowers what `from` owes `to`; if it goes below zero, `to` now owes `from`
  // the difference. Checks in this order: cents <= 0 -> InvalidAmount; an unknown member -> UnknownMember (from, then to);
  // from == to -> SamePerson. A refused payment changes nothing.
  virtual Status settle(const std::string& from, const std::string& to, long long cents) = 0;

  // What the member is owed overall (positive) or owes overall (negative): what they paid for others minus what others
  // paid for them, after settlements. 0 for an unknown member. The balances of all members always add up to 0.
  virtual long long balance(const std::string& member) const = 0;

  // Who owes whom right now, pair by pair: for each two members the two directions are netted into one entry, and a pair
  // that cancels out is omitted. Sorted by `from`, then by `to` (plain string order).
  virtual std::vector<Debt> debts() const = 0;
};

std::unique_ptr<Ledger> makeLedger();

}  // namespace split
