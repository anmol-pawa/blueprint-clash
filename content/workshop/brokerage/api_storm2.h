#pragma once
// Change Storm 2: corporate actions.
#include "api_storm1.h"

namespace broker {

class CorporateBrokerage : public FeeBrokerage {
 public:
  // A forward split. Every account's lots of `symbol` get `factor` times as many shares, the same total cost and the same
  // order (so FIFO is unchanged); the quote becomes `newQuote` (the market publishes it). Realized P&L and cash are not
  // touched. Checks: InvalidInput (empty symbol, factor outside 2..100, newQuote outside 1..kMaxQuote), then NoQuote when the
  // symbol was never quoted. A refused call changes nothing.
  virtual Status split(const std::string& symbol, int factor, int newQuote) = 0;

  // A cash dividend of `centsPerShare` (1..kMaxQuote) on every share of `symbol`: each account holding it gets
  // shares x centsPerShare in cash. Cost basis, lots and realized P&L are NOT touched; the money is counted separately in
  // dividendsReceived(). Checks: InvalidInput (empty symbol or amount out of range), then NoQuote.
  virtual Status dividend(const std::string& symbol, int centsPerShare) = 0;

  // The account's total dividends so far (InvalidInput, then UnknownAccount; touched only on Ok).
  virtual Status dividendsReceived(int id, long long& out) const = 0;
};

std::unique_ptr<CorporateBrokerage> makeCorporateBrokerage(const FeeSchedule& schedule);

}  // namespace broker
