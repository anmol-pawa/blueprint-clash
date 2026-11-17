#pragma once
#include <algorithm>
#include <vector>

#include "api_storm2.h"

// Decides how much of a total is paid back when a stay is cancelled `daysBefore` days ahead. A Strategy so that
// "no refunds" is not a special case in the cancellation code.
class RefundPolicy {
 public:
  virtual ~RefundPolicy() = default;
  virtual hotel::Money refund(hotel::Money total, long long daysBefore) const = 0;
};

class NoRefund : public RefundPolicy {
 public:
  hotel::Money refund(hotel::Money, long long) const override { return 0; }
};

// The tier with the largest daysBefore that is still <= the days remaining applies, whatever order they came in.
class TieredRefund : public RefundPolicy {
 public:
  explicit TieredRefund(std::vector<hotel::RefundTier> tiers) : tiers_(std::move(tiers)) {
    std::sort(tiers_.begin(), tiers_.end(),
              [](const hotel::RefundTier& a, const hotel::RefundTier& b) { return a.daysBefore > b.daysBefore; });
  }

  hotel::Money refund(hotel::Money total, long long daysBefore) const override {
    for (const hotel::RefundTier& tier : tiers_) {
      if (tier.daysBefore <= daysBefore) return total * tier.percent / 100;
    }
    return 0;
  }

  // True when the tiers are usable: sane numbers, no two with the same daysBefore.
  static bool areValid(const std::vector<hotel::RefundTier>& tiers) {
    for (std::size_t i = 0; i < tiers.size(); ++i) {
      if (tiers[i].percent < 0 || tiers[i].percent > 100 || tiers[i].daysBefore < 0) return false;
      for (std::size_t j = i + 1; j < tiers.size(); ++j) {
        if (tiers[i].daysBefore == tiers[j].daysBefore) return false;
      }
    }
    return true;
  }

 private:
  std::vector<hotel::RefundTier> tiers_;
};
