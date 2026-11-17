#pragma once
#include "api_storm1.h"

// Lets a plain Gateway be used where a RefundGateway is expected. Before refunds exist there is nothing to refund
// with, so any refund call is declined. An Adapter, so the processor has one gateway type to talk to.
class ChargeOnlyGateway : public pay::RefundGateway {
 public:
  explicit ChargeOnlyGateway(pay::Gateway& gateway) : gateway_(gateway) {}

  pay::Reply charge(const std::string& key, const std::string& card, pay::Money amount) override {
    return gateway_.charge(key, card, amount);
  }

  pay::Reply refund(const std::string&, const std::string&, pay::Money) override { return pay::Reply::Declined; }

 private:
  pay::Gateway& gateway_;
};
