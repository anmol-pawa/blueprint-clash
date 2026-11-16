#pragma once
#include <algorithm>
#include <map>
#include <string>
#include <utility>
#include <vector>

#include "api.h"

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
