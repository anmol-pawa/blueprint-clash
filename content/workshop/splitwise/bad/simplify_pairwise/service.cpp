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

// The people who may appear in expenses. A name is non-empty and unique.
class Members {
 public:
  bool add(const std::string& name) { return !name.empty() && names_.insert(name).second; }

  bool has(const std::string& name) const { return names_.count(name) > 0; }

  // Every name, sorted.
  std::vector<std::string> all() const { return std::vector<std::string>(names_.begin(), names_.end()); }

 private:
  std::set<std::string> names_;
};

// How one expense is cut into portions: portions[i] is what shares[i].member owes. A rule returns false when the listed
// values make no sense for it; when it returns true the portions add up to the expense exactly (no cent is lost).
class SplitRule {
 public:
  virtual ~SplitRule() = default;
  virtual bool apportion(long long cents, const std::vector<split::Share>& shares, std::vector<long long>& portions) const = 0;
};

// Everyone pays the same; the leftover cents go one each to the first names in the list.
class EqualSplit : public SplitRule {
 public:
  bool apportion(long long cents, const std::vector<split::Share>& shares, std::vector<long long>& portions) const override {
    const long long count = static_cast<long long>(shares.size());
    portions.assign(shares.size(), cents / count);
    const long long leftover = cents % count;
    for (long long i = 0; i < leftover; ++i) ++portions[static_cast<std::size_t>(i)];
    return true;
  }
};

// Each share names its own cents, which must add up to the expense.
class ExactSplit : public SplitRule {
 public:
  bool apportion(long long cents, const std::vector<split::Share>& shares, std::vector<long long>& portions) const override {
    long long total = 0;
    for (const split::Share& share : shares) {
      if (share.value < 0 || share.value > cents) return false;
      total += share.value;
    }
    if (total != cents) return false;
    portions.clear();
    for (const split::Share& share : shares) portions.push_back(share.value);
    return true;
  }
};

// Each share names a portion in basis points, which must add up to the whole. Rounded down, then the leftover cents go
// to the largest remainders (the "largest remainder" method), so the total is exact and nobody is shorted by more than a cent.
class PercentSplit : public SplitRule {
 public:
  bool apportion(long long cents, const std::vector<split::Share>& shares, std::vector<long long>& portions) const override {
    long long whole = 0;
    for (const split::Share& share : shares) {
      if (share.value < 0 || share.value > split::kWhole) return false;
      whole += share.value;
    }
    if (whole != split::kWhole) return false;
    portions.assign(shares.size(), 0);
    std::vector<long long> remainders(shares.size(), 0);
    long long given = 0;
    for (std::size_t i = 0; i < shares.size(); ++i) {
      const long long scaled = cents * shares[i].value;
      portions[i] = scaled / split::kWhole;
      remainders[i] = scaled % split::kWhole;
      given += portions[i];
    }
    handOutLeftover(cents - given, remainders, portions);
    return true;
  }

 private:
  static void handOutLeftover(long long leftover, const std::vector<long long>& remainders, std::vector<long long>& portions) {
    std::vector<std::size_t> order(remainders.size());
    std::iota(order.begin(), order.end(), static_cast<std::size_t>(0));
    std::stable_sort(order.begin(), order.end(), [&remainders](std::size_t a, std::size_t b) { return remainders[a] > remainders[b]; });
    for (long long k = 0; k < leftover; ++k) ++portions[order[static_cast<std::size_t>(k)]];
  }
};

// The rules by kind. A new kind of split is a new class registered here.
class SplitRules {
 public:
  SplitRules() {
    rules_[split::SplitKind::Equal] = std::make_unique<EqualSplit>();
    rules_[split::SplitKind::Exact] = std::make_unique<ExactSplit>();
    rules_[split::SplitKind::Percent] = std::make_unique<PercentSplit>();
  }

  const SplitRule* find(split::SplitKind kind) const {
    const auto found = rules_.find(kind);
    return found == rules_.end() ? nullptr : found->second.get();
  }

 private:
  std::map<split::SplitKind, std::unique_ptr<SplitRule>> rules_;
};

// Who owes whom, in cents. Debts are stored per direction and never edited in place: a payment is recorded as a debt the
// other way round, so the book is a plain sum of events and the net figures are derived.
class DebtBook {
 public:
  // `debtor` owes `creditor` another `cents`.
  void owe(const std::string& debtor, const std::string& creditor, long long cents) {
    if (cents > 0) debts_[{debtor, creditor}] += cents;
  }

  // `from` hands `to` `cents`, which is the same as `to` owing `from` that much more.
  void pay(const std::string& from, const std::string& to, long long cents) { owe(to, from, cents); }

  // What `from` owes `to` once the opposite direction has been cancelled. Never negative.
  long long owed(const std::string& from, const std::string& to) const {
    return std::max(0LL, directed(from, to) - directed(to, from));
  }

  // Positive when others owe this member overall, negative when this member owes.
  long long balance(const std::string& member) const {
    long long total = 0;
    for (const auto& entry : debts_) {
      if (entry.first.second == member) total += entry.second;
      if (entry.first.first == member) total -= entry.second;
    }
    return total;
  }

 private:
  long long directed(const std::string& debtor, const std::string& creditor) const {
    const auto found = debts_.find({debtor, creditor});
    return found == debts_.end() ? 0 : found->second;
  }

  std::map<std::pair<std::string, std::string>, long long> debts_;
};

// Turns balances into a short list of payments. It is a pure function of the balances: it knows nothing about expenses.
// Greedy: the largest debtor pays the largest creditor as much as they can, until nobody owes. That never needs more than
// (people with a balance) - 1 payments. A minimum is NP-hard (it contains subset-sum), so the greedy plan is not always
// the smallest, only always small, quick and easy to explain.
class DebtSimplifier {
 public:
  // positive balance = is owed, negative = owes. Zero balances may be present and are ignored.
  std::vector<split::Transfer> plan(const std::map<std::string, long long>& balances) const {
    std::vector<Party> debtors = side(balances, -1);
    std::vector<Party> creditors = side(balances, 1);
    std::vector<split::Transfer> transfers;
    while (!debtors.empty() && !creditors.empty()) {
      Party& debtor = *largest(debtors);
      Party& creditor = *largest(creditors);
      const long long amount = std::min(debtor.cents, creditor.cents);
      transfers.push_back(split::Transfer{debtor.name, creditor.name, amount});
      debtor.cents -= amount;
      creditor.cents -= amount;
      dropSettled(debtors);
      dropSettled(creditors);
    }
    return transfers;
  }

 private:
  struct Party {
    std::string name;
    long long cents;  // always positive: how much this party still has to pay or to receive
  };

  static std::vector<Party> side(const std::map<std::string, long long>& balances, int sign) {
    std::vector<Party> parties;
    for (const auto& entry : balances) {
      const long long cents = sign * entry.second;
      if (cents > 0) parties.push_back(Party{entry.first, cents});
    }
    return parties;
  }

  // The most money, and among equals the name that sorts first.
  static std::vector<Party>::iterator largest(std::vector<Party>& parties) {
    return std::max_element(parties.begin(), parties.end(), [](const Party& a, const Party& b) {
      return a.cents < b.cents || (a.cents == b.cents && a.name > b.name);
    });
  }

  static void dropSettled(std::vector<Party>& parties) {
    parties.erase(std::remove_if(parties.begin(), parties.end(), [](const Party& p) { return p.cents == 0; }), parties.end());
  }
};

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
    std::vector<split::Transfer> plan;
    for (const std::string& a : members_.all()) {
      for (const std::string& b : members_.all()) {
        const long long cents = book_.owed(a, b);
        if (cents > 0) plan.push_back(split::Transfer{a, b, cents});
      }
    }
    return plan;
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

std::unique_ptr<split::Ledger> split::makeLedger() { return std::make_unique<LedgerImpl>(); }

std::unique_ptr<split::SplitLedger> split::makeSplitLedger() { return std::make_unique<LedgerImpl>(); }

std::unique_ptr<split::SimplifyingLedger> split::makeSimplifyingLedger() { return std::make_unique<LedgerImpl>(); }

