#pragma once
#include <string>

// The interface the checkout code is written against.
enum class ChargeStatus { Approved, Declined, Unavailable };

class PaymentGateway {
 public:
  virtual ~PaymentGateway() = default;
  virtual ChargeStatus charge(long long cents, const std::string& currency) = 0;
};

// A vendor class you cannot change. Its vocabulary differs from ours: dollars as a double,
// a C-string currency, and numeric result codes.
//   0  = ok            13 = invalid amount      51 = insufficient funds
//   91 = issuer unavailable (retry later)
class LegacyBank {
 public:
  explicit LegacyBank(double limitDollars) : limit_(limitDollars) {}

  int submit(double dollars, const char* currencyCode) {
    ++calls_;
    lastAmount_ = dollars;
    lastCurrency_ = currencyCode;
    if (lastCurrency_ == "XXX") return 91;
    if (dollars <= 0.0) return 13;
    if (dollars > limit_) return 51;
    return 0;
  }
  int calls() const { return calls_; }
  double lastAmount() const { return lastAmount_; }
  const std::string& lastCurrency() const { return lastCurrency_; }

 private:
  double limit_;
  int calls_ = 0;
  double lastAmount_ = 0.0;
  std::string lastCurrency_;
};
