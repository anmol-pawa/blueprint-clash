#pragma once
#include <algorithm>
#include <map>
#include <string>
#include <vector>

#include "api_storm2.h"

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
