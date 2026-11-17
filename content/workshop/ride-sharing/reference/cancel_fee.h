#pragma once
#include "api_storm2.h"

// What a rider owes for cancelling a trip, given whether the driver had already arrived. A Strategy.
class CancelFee {
 public:
  virtual ~CancelFee() = default;
  virtual ride::Money charge(bool driverArrived) const = 0;
};

class NoCancelFee : public CancelFee {
 public:
  ride::Money charge(bool) const override { return 0; }
};

class FeeOnceArrived : public CancelFee {
 public:
  explicit FeeOnceArrived(ride::Money fee) : fee_(fee) {}
  ride::Money charge(bool driverArrived) const override { return driverArrived ? fee_ : 0; }
  static bool isValid(ride::Money fee) { return fee >= 0 && fee <= ride::kMaxCancelFee; }

 private:
  ride::Money fee_;
};
