#pragma once
#include "trade_desk.h"

// The facade the interface sees: validate, look the account up, hand the work to the collaborator that owns it.
class BrokerageImpl : public broker::CorporateBrokerage {
 public:
  explicit BrokerageImpl(const broker::FeeSchedule& schedule)
      : commission_(schedule), desk_(quotes_, commission_), actions_(accounts_) {}

  broker::Status openAccount(int id) override {
    if (!Rules::accountId(id)) return broker::Status::InvalidInput;
    return accounts_.open(id) ? broker::Status::Ok : broker::Status::DuplicateAccount;
  }

  broker::Status deposit(int id, long long cents) override {
    if (!Rules::accountId(id) || !Rules::cash(cents)) return broker::Status::InvalidInput;
    Account* account = accounts_.find(id);
    if (account == nullptr) return broker::Status::UnknownAccount;
    account->purse().credit(cents);
    return broker::Status::Ok;
  }

  broker::Status withdraw(int id, long long cents) override {
    if (!Rules::accountId(id) || !Rules::cash(cents)) return broker::Status::InvalidInput;
    Account* account = accounts_.find(id);
    if (account == nullptr) return broker::Status::UnknownAccount;
    if (account->purse().balance() < cents) return broker::Status::InsufficientFunds;
    account->purse().debit(cents);
    return broker::Status::Ok;
  }

  broker::Status setQuote(const std::string& symbol, int cents) override {
    if (!Rules::symbol(symbol) || !Rules::quote(cents)) return broker::Status::InvalidInput;
    quotes_.set(symbol, cents);
    return broker::Status::Ok;
  }

  broker::Status buy(int id, const std::string& symbol, int shares) override {
    if (!Rules::accountId(id) || !Rules::symbol(symbol) || !Rules::shares(shares)) return broker::Status::InvalidInput;
    Account* account = accounts_.find(id);
    return account == nullptr ? broker::Status::UnknownAccount : desk_.buy(*account, symbol, shares);
  }

  broker::Status sell(int id, const std::string& symbol, int shares) override {
    if (!Rules::accountId(id) || !Rules::symbol(symbol) || !Rules::shares(shares)) return broker::Status::InvalidInput;
    Account* account = accounts_.find(id);
    return account == nullptr ? broker::Status::UnknownAccount : desk_.sell(*account, symbol, shares);
  }

  broker::Status statement(int id, broker::Statement& out) const override {
    const Account* account = nullptr;
    const broker::Status status = accounts_.lookup(id, account);
    if (status != broker::Status::Ok) return status;
    out.cash = account->purse().balance();
    out.realizedPnl = account->totals().realized();
    out.portfolioValue = Valuation::of(*account, quotes_);
    out.positionCount = static_cast<int>(account->holdings().all().size());
    return broker::Status::Ok;
  }

  broker::Status holding(int id, const std::string& symbol, broker::Holding& out) const override {
    const Account* account = nullptr;
    if (!Rules::symbol(symbol)) return broker::Status::InvalidInput;
    const broker::Status status = accounts_.lookup(id, account);
    if (status != broker::Status::Ok) return status;
    const Position* position = account->holdings().find(symbol);
    out.shares = position == nullptr ? 0 : position->shares();
    out.costBasis = position == nullptr ? 0 : position->cost();
    return broker::Status::Ok;
  }

  broker::Status feesPaid(int id, long long& out) const override {
    const Account* account = nullptr;
    const broker::Status status = accounts_.lookup(id, account);
    if (status == broker::Status::Ok) out = account->totals().fees();
    return status;
  }

  broker::Status split(const std::string& symbol, int factor, int newQuote) override {
    int old = 0;
    if (!Rules::symbol(symbol) || !Rules::splitFactor(factor) || !Rules::quote(newQuote)) return broker::Status::InvalidInput;
    if (!quotes_.find(symbol, old)) return broker::Status::NoQuote;
    actions_.split(symbol, factor);
    quotes_.set(symbol, newQuote);
    return broker::Status::Ok;
  }

  broker::Status dividend(const std::string& symbol, int centsPerShare) override {
    int old = 0;
    if (!Rules::symbol(symbol) || !Rules::quote(centsPerShare)) return broker::Status::InvalidInput;
    if (!quotes_.find(symbol, old)) return broker::Status::NoQuote;
    actions_.dividend(symbol, centsPerShare);
    return broker::Status::Ok;
  }

  broker::Status dividendsReceived(int id, long long& out) const override {
    const Account* account = nullptr;
    const broker::Status status = accounts_.lookup(id, account);
    if (status == broker::Status::Ok) out = account->totals().dividends();
    return status;
  }

 private:
  Accounts accounts_;
  QuoteBoard quotes_;
  Commission commission_;
  TradeDesk desk_;
  CorporateActions actions_;
};
