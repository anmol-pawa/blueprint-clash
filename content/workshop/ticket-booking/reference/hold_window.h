#pragma once
#include <memory>
#include <utility>

#include "api.h"

// Owns the clock and the one definition of "a hold is live". Every question about whether a hold still counts,
// whether a seat is free and whether a confirm is in time goes through isLive().
class HoldWindow {
 public:
  HoldWindow(std::shared_ptr<tix::Clock> clock, long long ticks) : clock_(std::move(clock)), ticks_(ticks) {}

  // The tick from which a hold placed now no longer counts.
  long long expiryFromNow() const { return clock_->now() + ticks_; }

  // Live while now < expiresAt; expired from the expiry tick itself.
  bool isLive(long long expiresAt) const { return clock_->now() < expiresAt; }

 private:
  std::shared_ptr<tix::Clock> clock_;
  long long ticks_;
};
