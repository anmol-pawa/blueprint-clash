#pragma once
#include "member.h"

// The rule for "may this member borrow one more book?". The extension seam for new member types.
class LoanPolicy {
 public:
  virtual ~LoanPolicy() = default;
  virtual bool mayBorrow(const Member& member) const = 0;
};

class FixedLimitPolicy : public LoanPolicy {
 public:
  explicit FixedLimitPolicy(int limit) : limit_(limit) {}
  bool mayBorrow(const Member& member) const override { return member.loanCount() < limit_; }

 private:
  int limit_;
};

// Storm 1: the limit depends on the member's tier. A new class, no change to LoanPolicy or its callers.
class TierLimitPolicy : public LoanPolicy {
 public:
  TierLimitPolicy(int basicLimit, int premiumLimit) : basic_(basicLimit), premium_(premiumLimit) {}
  bool mayBorrow(const Member& member) const override { return member.loanCount() < limitFor(member.tier()); }
  int limitFor(lib::Tier tier) const { return tier == lib::Tier::Premium ? premium_ : basic_; }

 private:
  int basic_;
  int premium_;
};
