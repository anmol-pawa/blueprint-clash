#pragma once
#include <string>
#include <unordered_map>

#include "api_storm2.h"

// The latest price of every symbol that was ever quoted.
class QuoteBoard {
 public:
  void set(const std::string& symbol, int cents) { quotes_[symbol] = cents; }

  bool find(const std::string& symbol, int& cents) const {
    const auto it = quotes_.find(symbol);
    if (it == quotes_.end()) return false;
    cents = it->second;
    return true;
  }

 private:
  std::unordered_map<std::string, int> quotes_;
};

// What a trade costs in commission. The all-zero schedule charges nothing.
class Commission {
 public:
  explicit Commission(const broker::FeeSchedule& schedule) : schedule_(schedule) {}

  long long on(long long value) const {
    const long long percent = (value * schedule_.basisPoints + kBasisPointsPerWhole - 1) / kBasisPointsPerWhole;
    const long long fee = schedule_.flat + percent;
    return fee < schedule_.minimum ? schedule_.minimum : fee;
  }

 private:
  static constexpr long long kBasisPointsPerWhole = 10000;
  broker::FeeSchedule schedule_;
};

// The legal ranges, in one place.
struct Rules {
  static bool accountId(int id) { return id >= 1; }
  static bool symbol(const std::string& s) { return !s.empty(); }
  static bool cash(long long cents) { return cents >= 1 && cents <= broker::kMaxCash; }
  static bool quote(int cents) { return cents >= 1 && cents <= broker::kMaxQuote; }
  static bool shares(int count) { return count >= 1 && count <= broker::kMaxShares; }
  static bool splitFactor(int factor) { return factor >= kMinSplit && factor <= kMaxSplit; }

  static constexpr int kMinSplit = 2;
  static constexpr int kMaxSplit = 100;
};
