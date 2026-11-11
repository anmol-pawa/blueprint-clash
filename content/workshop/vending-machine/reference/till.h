#pragma once

// Owns the customer's credit and knows which coins are real.
class Till {
 public:
  static bool isValidCoin(int cents) { return cents == 5 || cents == 10 || cents == 25 || cents == 100; }

  void insert(int cents) { creditCents_ += cents; }
  long long credit() const { return creditCents_; }
  bool covers(long long priceCents) const { return creditCents_ >= priceCents; }

  // Hands back everything and resets to zero.
  long long refundAll() {
    long long amount = creditCents_;
    creditCents_ = 0;
    return amount;
  }

  // Keeps the price and returns the rest as change; the credit becomes zero.
  // Precondition: covers(priceCents).
  long long takePriceAndRefundChange(long long priceCents) {
    creditCents_ -= priceCents;
    return refundAll();
  }

 private:
  long long creditCents_ = 0;
};
