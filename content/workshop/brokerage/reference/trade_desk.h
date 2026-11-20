#pragma once
#include "account.h"
#include "market.h"

// Market orders at the current quote: the one place that moves cash, lots and totals together.
class TradeDesk {
 public:
  TradeDesk(const QuoteBoard& quotes, const Commission& commission) : quotes_(quotes), commission_(commission) {}

  broker::Status buy(Account& account, const std::string& symbol, long long shares) const {
    int quote = 0;
    if (!quotes_.find(symbol, quote)) return broker::Status::NoQuote;
    const long long value = shares * quote;
    const long long fee = commission_.on(value);
    if (account.purse().balance() < value + fee) return broker::Status::InsufficientFunds;
    account.purse().debit(value + fee);
    account.totals().addFee(fee);
    account.holdings().open(symbol).add(Lot(shares, value + fee));
    return broker::Status::Ok;
  }

  broker::Status sell(Account& account, const std::string& symbol, long long shares) const {
    Position* position = account.holdings().find(symbol);
    int quote = 0;
    if (position == nullptr || position->shares() < shares || !quotes_.find(symbol, quote)) {
      return broker::Status::InsufficientShares;
    }
    const long long value = shares * quote;
    const long long fee = commission_.on(value);
    if (fee > value) return broker::Status::InsufficientFunds;
    const long long cost = position->sellFifo(shares);
    account.holdings().closeIfEmpty(symbol);
    account.purse().credit(value - fee);
    account.totals().addFee(fee);
    account.totals().addRealized(value - fee - cost);
    return broker::Status::Ok;
  }

 private:
  const QuoteBoard& quotes_;
  const Commission& commission_;
};

// What an account is worth at today's quotes.
struct Valuation {
  static long long of(const Account& account, const QuoteBoard& quotes) {
    long long total = account.purse().balance();
    for (const auto& entry : account.holdings().all()) {
      int quote = 0;
      if (quotes.find(entry.first, quote)) total += entry.second.shares() * quote;
    }
    return total;
  }
};

// Splits and dividends touch every holder of a symbol and nothing else in the design.
class CorporateActions {
 public:
  explicit CorporateActions(Accounts& accounts) : accounts_(accounts) {}

  void split(const std::string& symbol, int factor) {
    accounts_.forEach([&](Account& account) {
      Position* position = account.holdings().find(symbol);
      if (position != nullptr) position->split(factor);
    });
  }

  void dividend(const std::string& symbol, int centsPerShare) {
    accounts_.forEach([&](Account& account) {
      const Position* position = account.holdings().find(symbol);
      if (position == nullptr) return;
      const long long paid = position->shares() * centsPerShare;
      account.purse().credit(paid);
      account.totals().addDividend(paid);
    });
  }

 private:
  Accounts& accounts_;
};
