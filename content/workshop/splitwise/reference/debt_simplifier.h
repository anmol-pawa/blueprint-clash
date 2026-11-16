#pragma once
#include <algorithm>
#include <map>
#include <string>
#include <vector>

#include "api_storm2.h"

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
