#pragma once
#include <map>
#include <set>
#include <string>

#include "api_storm2.h"

// Owns the PIN rules: wrong attempts are counted per card across visits, and a card that fails three times in a row is
// kept for good.
class PinGuard {
 public:
  enum class Verdict { Accepted, Rejected, Retained };

  bool isRetained(const std::string& card) const { return retained_.count(card) > 0; }

  Verdict check(const atm::Bank& bank, const std::string& card, const std::string& pin) {
    if (bank.pinMatches(card, pin)) {
      wrongInARow_.erase(card);
      return Verdict::Accepted;
    }
    if (++wrongInARow_[card] < kAttempts) return Verdict::Rejected;
    wrongInARow_.erase(card);
    retained_.insert(card);
    return Verdict::Retained;
  }

 private:
  static constexpr int kAttempts = 3;
  std::map<std::string, int> wrongInARow_;
  std::set<std::string> retained_;
};
