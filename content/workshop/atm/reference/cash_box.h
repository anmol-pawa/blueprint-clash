#pragma once
#include "api_storm2.h"

// The notes inside the machine. It knows nothing about customers, PINs or what a good payout is.
class CashBox {
 public:
  explicit CashBox(const atm::Notes& initial) {
    for (const auto& entry : initial) {
      if (entry.first > 0 && entry.second >= 0) notes_[entry.first] = entry.second;
    }
  }

  // Every declared denomination, zero counts included, so a dispenser can plan with them.
  const atm::Notes& declared() const { return notes_; }

  // Only denominations that still have notes, as the API reports them.
  atm::Notes inStock() const {
    atm::Notes present;
    for (const auto& entry : notes_) {
      if (entry.second > 0) present[entry.first] = entry.second;
    }
    return present;
  }

  bool empty() const {
    for (const auto& entry : notes_) {
      if (entry.second > 0) return false;
    }
    return true;
  }

  void remove(const atm::Notes& taken) {
    for (const auto& entry : taken) notes_[entry.first] -= entry.second;
  }

 private:
  atm::Notes notes_;
};
