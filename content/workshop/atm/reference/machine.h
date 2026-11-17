#pragma once
#include <memory>
#include <string>
#include <utility>

#include "api_storm2.h"
#include "cash_box.h"
#include "payout.h"
#include "pin_guard.h"

// The parts a session uses: the card slot, the cash, the PIN rules and the payout. The states decide WHEN each part may
// be used; the machine only does the work.
class Machine {
 public:
  Machine(atm::Bank& bank, const atm::Notes& stock, std::unique_ptr<NoteDispenser> dispenser, std::unique_ptr<WithdrawalLimit> limit)
      : bank_(bank), cash_(stock), payout_(bank, cash_, std::move(dispenser), std::move(limit)) {}

  bool hasNotes() const { return !cash_.empty(); }

  atm::Notes stock() const { return cash_.inStock(); }

  // Takes the card into the slot when the machine is willing to; otherwise says why.
  atm::Status admit(const std::string& card) {
    if (pins_.isRetained(card)) return atm::Status::CardBlocked;
    if (!bank_.knowsCard(card)) return atm::Status::UnknownCard;
    card_ = card;
    return atm::Status::Ok;
  }

  PinGuard::Verdict verifyPin(const std::string& pin) { return pins_.check(bank_, card_, pin); }

  atm::Status pay(long long amount, atm::Notes& out) { return payout_.pay(card_, amount, out); }

  void release() { card_.clear(); }

  void newDay() { payout_.newDay(); }

 private:
  atm::Bank& bank_;
  CashBox cash_;
  PinGuard pins_;
  Payout payout_;
  std::string card_;
};
