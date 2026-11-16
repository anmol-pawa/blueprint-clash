#pragma once
// Public API for the Splitwise problem. The hidden tests only use what is declared here.
// You implement split::makeLedger() (in any of your .cpp files); everything behind it is your design.
// Nothing here throws: this code is compiled without exceptions.
#include <memory>
#include <string>
#include <vector>

namespace split {

// Money is a whole number of cents (no floating point). Every amount is in 1 .. kMaxCents.
constexpr long long kMaxCents = 1000000000000LL;

enum class Status {
  Ok,
  InvalidAmount,         // the amount is below 1 or above kMaxCents
  NoParticipants,        // an expense with nobody to share it
  UnknownMember,         // the payer, a participant, or a settling party is not a member
  DuplicateParticipant,  // the same member is listed twice in one expense
  SameMember,            // settleUp(a, a)
  BadSplit,              // the listed split values do not describe a valid split (not produced by an equal split)
};

class Ledger {
 public:
  virtual ~Ledger() = default;

  // Adds a person to the group. Returns false (and changes nothing) for an empty name or a name already present.
  virtual bool addMember(const std::string& name) = 0;

  // `payer` paid `cents` for everyone in `participants`, who share it equally. The payer need not be a participant.
  // When the cents do not divide evenly, the first (cents % n) participants in the order given pay one cent more.
  // Checks run in this order and the first failure decides, changing nothing:
  //   1. cents outside 1 .. kMaxCents      -> InvalidAmount
  //   2. no participants                   -> NoParticipants
  //   3. the payer or a participant is not a member -> UnknownMember
  //   4. a participant listed twice        -> DuplicateParticipant
  // Participants other than the payer now owe the payer their share. The payer owes nothing to themselves.
  virtual Status addExpense(const std::string& payer, long long cents, const std::vector<std::string>& participants) = 0;

  // `from` pays `to` `cents` in real money, which reduces what `from` owes `to`. Paying more than is owed is allowed:
  // the debt turns around and `to` now owes `from` the difference. Checks, in order: cents outside 1 .. kMaxCents ->
  // InvalidAmount; either name is not a member -> UnknownMember; from == to -> SameMember.
  virtual Status settleUp(const std::string& from, const std::string& to, long long cents) = 0;

  // What the group owes this member (positive) or what this member owes the group (negative), in cents. The balances of
  // all members always add up to zero. An unknown name has balance 0.
  virtual long long balance(const std::string& member) const = 0;

  // What `from` owes `to` directly, after cancelling anything `to` owes `from` the other way round. Never negative; at
  // most one of owed(a, b) and owed(b, a) is non-zero. Unknown names owe nothing.
  virtual long long owed(const std::string& from, const std::string& to) const = 0;
};

std::unique_ptr<Ledger> makeLedger();

}  // namespace split
