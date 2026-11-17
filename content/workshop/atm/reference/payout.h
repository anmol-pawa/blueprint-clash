#pragma once
#include <memory>
#include <string>
#include <utility>

#include "api_storm2.h"
#include "cash_box.h"
#include "note_dispenser.h"
#include "withdrawal_limit.h"

// One withdrawal, all or nothing: every check runs before anything moves, and the bank is debited exactly once.
class Payout {
 public:
  Payout(atm::Bank& bank, CashBox& cash, std::unique_ptr<NoteDispenser> dispenser, std::unique_ptr<WithdrawalLimit> limit)
      : bank_(bank), cash_(cash), dispenser_(std::move(dispenser)), limit_(std::move(limit)) {}

  atm::Status pay(const std::string& card, long long amount, atm::Notes& out) {
    out.clear();
    if (amount < 1 || amount > atm::kMaxWithdrawal) return atm::Status::InvalidAmount;
    if (!limit_->allows(card, amount)) return atm::Status::DailyLimitExceeded;
    if (amount > bank_.available(card)) return atm::Status::InsufficientFunds;
    atm::Notes chosen;
    if (!dispenser_->plan(amount, cash_.declared(), chosen)) return atm::Status::CannotDispense;
    bank_.debit(card, amount);
    cash_.remove(chosen);
    limit_->record(card, amount);
    out = chosen;
    return atm::Status::Ok;
  }

  void newDay() { limit_->newDay(); }

 private:
  atm::Bank& bank_;
  CashBox& cash_;
  std::unique_ptr<NoteDispenser> dispenser_;
  std::unique_ptr<WithdrawalLimit> limit_;
};
