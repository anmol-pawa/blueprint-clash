#pragma once
#include <map>
#include <string>

#include "lot.h"

// The cash an account holds. It never goes below zero because every debit is checked by the caller first.
class Purse {
 public:
  long long balance() const { return balance_; }
  void credit(long long cents) { balance_ += cents; }
  void debit(long long cents) { balance_ -= cents; }

 private:
  long long balance_ = 0;
};

// The running totals that are reported but never spent from.
class Totals {
 public:
  long long realized() const { return realized_; }
  long long fees() const { return fees_; }
  long long dividends() const { return dividends_; }
  void addRealized(long long cents) { realized_ += cents; }
  void addFee(long long cents) { fees_ += cents; }
  void addDividend(long long cents) { dividends_ += cents; }

 private:
  long long realized_ = 0;
  long long fees_ = 0;
  long long dividends_ = 0;
};

// The positions of one account, one per symbol that still has shares.
class Holdings {
 public:
  Position& open(const std::string& symbol) { return positions_[symbol]; }

  Position* find(const std::string& symbol) {
    const auto it = positions_.find(symbol);
    return it == positions_.end() ? nullptr : &it->second;
  }

  const Position* find(const std::string& symbol) const {
    const auto it = positions_.find(symbol);
    return it == positions_.end() ? nullptr : &it->second;
  }

  void closeIfEmpty(const std::string& symbol) {
    const auto it = positions_.find(symbol);
    if (it != positions_.end() && it->second.empty()) positions_.erase(it);
  }

  const std::map<std::string, Position>& all() const { return positions_; }

 private:
  std::map<std::string, Position> positions_;
};

class Account {
 public:
  Purse& purse() { return purse_; }
  const Purse& purse() const { return purse_; }
  Holdings& holdings() { return holdings_; }
  const Holdings& holdings() const { return holdings_; }
  Totals& totals() { return totals_; }
  const Totals& totals() const { return totals_; }

 private:
  Purse purse_;
  Holdings holdings_;
  Totals totals_;
};

class Accounts {
 public:
  bool open(int id) { return accounts_.emplace(id, Account()).second; }

  Account* find(int id) {
    const auto it = accounts_.find(id);
    return it == accounts_.end() ? nullptr : &it->second;
  }

  const Account* find(int id) const {
    const auto it = accounts_.find(id);
    return it == accounts_.end() ? nullptr : &it->second;
  }

  // The shared check order of every account call: a bad id first, then an id nobody opened.
  broker::Status lookup(int id, const Account*& account) const {
    if (id < 1) return broker::Status::InvalidInput;
    account = find(id);
    return account == nullptr ? broker::Status::UnknownAccount : broker::Status::Ok;
  }

  template <typename Fn>
  void forEach(Fn fn) {
    for (auto& entry : accounts_) fn(entry.second);
  }

 private:
  std::map<int, Account> accounts_;
};
