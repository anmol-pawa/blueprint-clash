#pragma once
#include <set>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "debt_simplifier.h"
#include "member_book.h"
#include "pair_ledger.h"
#include "split_rule.h"

// The facade: checks a request in the documented order, then asks the collaborators. It has no rule of its own about
// rounding, split kinds or simplification.
class LedgerImpl : public split::SimplifyingLedger {
 public:
  bool addMember(const std::string& id) override { return members_.add(id); }

  split::Status addExpense(const std::string& payer, long long cents, const std::vector<std::string>& participants) override {
    split::SplitSpec spec;
    for (const auto& member : participants) spec.parts.push_back({member, 0});
    return addExpenseSplit(payer, cents, spec);
  }

  split::Status addExpenseSplit(const std::string& payer, long long cents, const split::SplitSpec& spec) override {
    const split::Status refusal = check(payer, cents, spec);
    if (refusal != split::Status::Ok) return refusal;
    const std::vector<long long> shares = rules_.of(spec.kind).shares(cents, spec.parts);
    for (std::size_t i = 0; i < spec.parts.size(); ++i) {
      if (spec.parts[i].member != payer) pairs_.owe(spec.parts[i].member, payer, shares[i]);
    }
    return split::Status::Ok;
  }

  split::Status settle(const std::string& from, const std::string& to, long long cents) override {
    if (cents <= 0) return split::Status::InvalidAmount;
    if (!members_.has(from) || !members_.has(to)) return split::Status::UnknownMember;
    if (from == to) return split::Status::SamePerson;
    pairs_.owe(from, to, -cents);
    return split::Status::Ok;
  }

  long long balance(const std::string& member) const override { return pairs_.balance(member); }
  std::vector<split::Debt> debts() const override { return pairs_.debts(); }
  std::vector<split::Debt> simplify() const override { return DebtSimplifier().simplify(pairs_.balances()); }

 private:
  split::Status check(const std::string& payer, long long cents, const split::SplitSpec& spec) const {
    if (cents <= 0) return split::Status::InvalidAmount;
    if (spec.parts.empty()) return split::Status::NoParticipants;
    if (!members_.has(payer)) return split::Status::UnknownMember;
    std::set<std::string> seen;
    for (const auto& part : spec.parts) {
      if (!members_.has(part.member)) return split::Status::UnknownMember;
    }
    for (const auto& part : spec.parts) {
      if (!seen.insert(part.member).second) return split::Status::DuplicateParticipant;
    }
    if (!rules_.of(spec.kind).accepts(cents, spec.parts)) return split::Status::BadSplit;
    return split::Status::Ok;
  }

  MemberBook members_;
  PairLedger pairs_;
  SplitRules rules_;
};
