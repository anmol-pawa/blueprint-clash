#pragma once
#include "order_book.h"

constexpr int kPercentDenominator = 100;

// What a customer owes for cancelling, by the stage the order has reached. A Strategy: the rule is the part that
// changes with the business, and the lifecycle never looks inside it.
class CancellationFee {
 public:
  virtual ~CancellationFee() = default;
  virtual food::Money feeFor(food::OrderState state, food::Money cost) const = 0;
};

class StageFee : public CancellationFee {
 public:
  food::Money feeFor(food::OrderState state, food::Money cost) const override {
    switch (state) {
      case food::OrderState::Accepted: return cost * food::kCookingFeePercent / kPercentDenominator;
      case food::OrderState::Ready: return cost;
      default: return 0;
    }
  }
};
