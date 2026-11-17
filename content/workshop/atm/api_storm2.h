#pragma once
// Change Storm 2: a daily withdrawal limit per card. Everything from api.h still holds (notes are chosen greedily, as in makeAtm).
#include "api_storm1.h"

namespace atm {

class LimitedAtm : public Atm {
 public:
  // A new banking day: every card's total for the day goes back to zero. Cards retained earlier stay retained.
  virtual void endOfDay() = 0;
};

// Each card may withdraw at most `dailyLimit` in total per day. The check goes between the amount check and the funds check:
//   1. amount below 1 or above kMaxWithdrawal             -> InvalidAmount
//   2. withdrawn today by this card + amount > dailyLimit -> DailyLimitExceeded
//   3. amount above bank.available(card)                  -> InsufficientFunds
//   4. the notes cannot make the amount exactly           -> CannotDispense
// Only successful withdrawals count towards the day's total; refused ones do not. A card that has used up its limit can
// still be inserted and ejected; only the withdrawal is refused. The total is kept per card, not per session.
std::unique_ptr<LimitedAtm> makeLimitedAtm(Bank& bank, const Notes& stock, long long dailyLimit);

}  // namespace atm
