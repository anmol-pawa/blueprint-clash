#pragma once
#include <string>
#include "api.h"

// TODO: implement LegacyBankAdapter so checkout can use LegacyBank through PaymentGateway.
// Hold the bank by reference, convert cents to dollars, and map result codes to ChargeStatus.
class LegacyBankAdapter : public PaymentGateway {
 public:
  explicit LegacyBankAdapter(LegacyBank& bank) { (void)bank; }
  ChargeStatus charge(long long cents, const std::string& currency) override {
    (void)cents;
    (void)currency;
    return ChargeStatus::Declined;
  }
};
