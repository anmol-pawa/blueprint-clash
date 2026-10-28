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
