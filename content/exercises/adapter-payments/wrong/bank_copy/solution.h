#pragma once
#include <string>
#include "api.h"

// Adapter: translates our PaymentGateway vocabulary (cents, std::string, enum) into the vendor's
// (dollars, const char*, int codes). It holds a reference, so the vendor object stays the single
// source of truth for its own state.
class LegacyBankAdapter final : public PaymentGateway {
 public:
  explicit LegacyBankAdapter(LegacyBank& bank) : bank_(bank) {}

  ChargeStatus charge(long long cents, const std::string& currency) override {
    if (cents <= 0 || currency.empty()) return ChargeStatus::Declined;
    const int code = bank_.submit(static_cast<double>(cents) / 100.0, currency.c_str());
    return translate(code);
  }

 private:
  static ChargeStatus translate(int code) {
    if (code == 0) return ChargeStatus::Approved;
    if (code == 91) return ChargeStatus::Unavailable;
    return ChargeStatus::Declined;
  }

  LegacyBank bank_;
};
