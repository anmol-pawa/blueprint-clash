#pragma once
#include <algorithm>
#include <map>
#include <string>
#include <utility>

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
