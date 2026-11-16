#pragma once
#include <algorithm>
#include <cstddef>
#include <map>
#include <memory>
#include <numeric>
#include <vector>

#include "api_storm2.h"

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
