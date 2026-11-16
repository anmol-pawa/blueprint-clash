#pragma once
#include <cstddef>
#include <map>
#include <set>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "debt_book.h"
#include "debt_simplifier.h"
#include "members.h"
#include "split_rules.h"

// The public face: checks a request in the documented order and sequences the collaborators. It has no rule of its own
// about how a bill is cut, how debts are netted or how a plan is built.
class LedgerImpl : public split::SimplifyingLedger {
 public:
  bool addMember(const std::string& name) override { return members_.add(name); }

  split::Status addExpense(const std::string& payer, long long cents, const std::vector<std::string>& participants) override {
    split::SplitSpec spec;
    spec.kind = split::SplitKind::Equal;
    for (const std::string& name : participants) spec.shares.push_back(split::Share{name, 0});
    return addExpenseWith(payer, cents, spec);
  }

  split::Status addExpenseWith(const std::string& payer, long long cents, const split::SplitSpec& spec) override {
    const split::Status verdict = check(payer, cents, spec.shares);
    if (verdict != split::Status::Ok) return verdict;
    const SplitRule* rule = rules_.find(spec.kind);
    std::vector<long long> portions;
    if (rule == nullptr || !rule->apportion(cents, spec.shares, portions)) return split::Status::BadSplit;
    for (std::size_t i = 0; i < spec.shares.size(); ++i) {
      if (spec.shares[i].member != payer) book_.owe(spec.shares[i].member, payer, portions[i]);
    }
    return split::Status::Ok;
  }

  split::Status settleUp(const std::string& from, const std::string& to, long long cents) override {
    if (cents < 1 || cents > split::kMaxCents) return split::Status::InvalidAmount;
    if (!members_.has(from) || !members_.has(to)) return split::Status::UnknownMember;
    if (from == to) return split::Status::SameMember;
    book_.pay(from, to, cents);
    return split::Status::Ok;
  }

  long long balance(const std::string& member) const override { return book_.balance(member); }

  long long owed(const std::string& from, const std::string& to) const override { return book_.owed(from, to); }

  std::vector<split::Transfer> simplify() const override {
    std::map<std::string, long long> balances;
    for (const std::string& name : members_.all()) balances[name] = book_.balance(name);
    return simplifier_.plan(balances);
  }

 private:
  split::Status check(const std::string& payer, long long cents, const std::vector<split::Share>& shares) const {
    if (cents < 1 || cents > split::kMaxCents) return split::Status::InvalidAmount;
    if (shares.empty()) return split::Status::NoParticipants;
    if (!members_.has(payer)) return split::Status::UnknownMember;
    for (const split::Share& share : shares) {
      if (!members_.has(share.member)) return split::Status::UnknownMember;
    }
    std::set<std::string> seen;
    for (const split::Share& share : shares) {
      if (!seen.insert(share.member).second) return split::Status::DuplicateParticipant;
    }
    return split::Status::Ok;
  }

  Members members_;
  SplitRules rules_;
  DebtBook book_;
  DebtSimplifier simplifier_;
};
