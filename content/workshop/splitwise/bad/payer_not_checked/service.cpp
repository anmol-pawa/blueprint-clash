// A flawed design: payer not checked.
#include "api.h"
#include "api_storm2.h"
#include <algorithm>
#include <cstddef>
#include <map>
#include <memory>
#include <numeric>
#include <set>
#include <string>
#include <utility>
#include <vector>

// The people in the group. Knows nothing about money.
class MemberBook {
 public:
  bool add(const std::string& id) { return !id.empty() && ids_.insert(id).second; }
  bool has(const std::string& id) const { return ids_.count(id) > 0; }

 private:
  std::set<std::string> ids_;
};

// The one source of truth about money: for every two members, the net amount one owes the other. Balances and the debt
// list are both views of it, so they cannot disagree.
class PairLedger {
 public:
  // `debtor` owes `creditor` `cents` more (a negative amount means less).
  void owe(const std::string& debtor, const std::string& creditor, long long cents) {
    if (debtor < creditor) {
      net_[{debtor, creditor}] += cents;
    } else {
      net_[{creditor, debtor}] -= cents;
    }
  }

  long long balance(const std::string& member) const {
    long long total = 0;
    for (const auto& [pair, cents] : net_) {
      if (pair.first == member) total -= cents;
      if (pair.second == member) total += cents;
    }
    return total;
  }

  std::map<std::string, long long> balances() const {
    std::map<std::string, long long> all;
    for (const auto& [pair, cents] : net_) {
      all[pair.first] -= cents;
      all[pair.second] += cents;
    }
    return all;
  }

  std::vector<split::Debt> debts() const {
    std::vector<split::Debt> out;
    for (const auto& [pair, cents] : net_) {
      if (cents > 0) out.push_back({pair.first, pair.second, cents});
      if (cents < 0) out.push_back({pair.second, pair.first, -cents});
    }
    std::sort(out.begin(), out.end(), [](const split::Debt& a, const split::Debt& b) {
      return a.from != b.from ? a.from < b.from : a.to < b.to;
    });
    return out;
  }

 private:
  // Key (a, b) with a < b; the value is what a owes b (negative: b owes a).
  std::map<std::pair<std::string, std::string>, long long> net_;
};

// Divides whole cents in proportion to weights without losing or inventing a cent.
class Apportioner {
 public:
  // `weights` are all >= 0 and add up to more than 0. Every part is rounded down first; the cents that are left go one each
  // to the largest rounded-away fractions, and a tie goes to the earlier position.
  std::vector<long long> divide(long long total, const std::vector<long long>& weights) const {
    const long long weightSum = std::accumulate(weights.begin(), weights.end(), 0LL);
    std::vector<long long> parts(weights.size());
    std::vector<long long> lost(weights.size());
    long long given = 0;
    for (std::size_t i = 0; i < weights.size(); ++i) {
      parts[i] = total * weights[i] / weightSum;
      lost[i] = total * weights[i] % weightSum;
      given += parts[i];
    }
    std::vector<std::size_t> order(weights.size());
    std::iota(order.begin(), order.end(), std::size_t{0});
    std::stable_sort(order.begin(), order.end(), [&lost](std::size_t a, std::size_t b) { return lost[a] > lost[b]; });
    for (long long k = 0; k < total - given; ++k) ++parts[order[static_cast<std::size_t>(k)]];
    return parts;
  }
};

// One way of turning "an amount and some people" into "what each person owes". A new way is a new class.
class SplitRule {
 public:
  virtual ~SplitRule() = default;
  // Do the numbers in `parts` describe a valid split of `cents`?
  virtual bool accepts(long long cents, const std::vector<split::Part>& parts) const = 0;
  // What each part owes, in the same order. Only called when accepts() said yes; the shares add up to `cents`.
  virtual std::vector<long long> shares(long long cents, const std::vector<split::Part>& parts) const = 0;
};

namespace split_rules {
inline std::vector<long long> values(const std::vector<split::Part>& parts) {
  std::vector<long long> out;
  for (const auto& part : parts) out.push_back(part.value);
  return out;
}
inline long long total(const std::vector<split::Part>& parts) {
  long long sum = 0;
  for (const auto& part : parts) sum += part.value;
  return sum;
}
}  // namespace split_rules

class EqualSplit : public SplitRule {
 public:
  bool accepts(long long, const std::vector<split::Part>&) const override { return true; }
  std::vector<long long> shares(long long cents, const std::vector<split::Part>& parts) const override {
    return Apportioner().divide(cents, std::vector<long long>(parts.size(), 1));
  }
};

class ExactSplit : public SplitRule {
 public:
  bool accepts(long long cents, const std::vector<split::Part>& parts) const override {
    for (const auto& part : parts) {
      if (part.value < 0) return false;
    }
    return split_rules::total(parts) == cents;
  }
  std::vector<long long> shares(long long, const std::vector<split::Part>& parts) const override {
    return split_rules::values(parts);
  }
};

class PercentSplit : public SplitRule {
 public:
  bool accepts(long long, const std::vector<split::Part>& parts) const override {
    for (const auto& part : parts) {
      if (part.value < 0) return false;
    }
    return split_rules::total(parts) == 10000;
  }
  std::vector<long long> shares(long long cents, const std::vector<split::Part>& parts) const override {
    return Apportioner().divide(cents, split_rules::values(parts));
  }
};

class SharesSplit : public SplitRule {
 public:
  bool accepts(long long, const std::vector<split::Part>& parts) const override {
    for (const auto& part : parts) {
      if (part.value <= 0) return false;
    }
    return true;
  }
  std::vector<long long> shares(long long cents, const std::vector<split::Part>& parts) const override {
    return Apportioner().divide(cents, split_rules::values(parts));
  }
};

// Finds the rule for a kind. Adding a kind means adding a class and one line here.
class SplitRules {
 public:
  SplitRules() {
    rules_[split::SplitKind::Equal] = std::make_unique<EqualSplit>();
    rules_[split::SplitKind::Exact] = std::make_unique<ExactSplit>();
    rules_[split::SplitKind::Percent] = std::make_unique<PercentSplit>();
    rules_[split::SplitKind::Shares] = std::make_unique<SharesSplit>();
  }
  const SplitRule& of(split::SplitKind kind) const {
    const auto found = rules_.find(kind);
    return found != rules_.end() ? *found->second : *rules_.at(split::SplitKind::Equal);
  }

 private:
  std::map<split::SplitKind, std::unique_ptr<SplitRule>> rules_;
};

// Turns balances into a short list of payments, greedily: the biggest debtor pays the biggest creditor.
class DebtSimplifier {
 public:
  std::vector<split::Debt> simplify(const std::map<std::string, long long>& balances) const {
    Amounts owing;
    Amounts owed;
    for (const auto& [member, balance] : balances) {
      if (balance < 0) owing[member] = -balance;
      if (balance > 0) owed[member] = balance;
    }
    std::vector<split::Debt> payments;
    while (!owing.empty() && !owed.empty()) {
      const auto debtor = largest(owing);
      const auto creditor = largest(owed);
      const long long moved = std::min(debtor->second, creditor->second);
      payments.push_back({debtor->first, creditor->first, moved});
      debtor->second -= moved;
      creditor->second -= moved;
      if (debtor->second == 0) owing.erase(debtor);
      if (creditor->second == 0) owed.erase(creditor);
    }
    return payments;
  }

 private:
  using Amounts = std::map<std::string, long long>;

  // The first largest in key order, so a tie goes to the smaller id.
  static Amounts::iterator largest(Amounts& amounts) {
    return std::max_element(amounts.begin(), amounts.end(),
                            [](const auto& a, const auto& b) { return a.second < b.second; });
  }
};

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

std::unique_ptr<split::Ledger> split::makeLedger() { return std::make_unique<LedgerImpl>(); }
std::unique_ptr<split::SplittingLedger> split::makeSplittingLedger() { return std::make_unique<LedgerImpl>(); }
std::unique_ptr<split::SimplifyingLedger> split::makeSimplifyingLedger() { return std::make_unique<LedgerImpl>(); }
