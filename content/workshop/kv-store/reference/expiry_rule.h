#pragma once
#include <memory>
#include <optional>
#include <utility>

#include "api.h"
#include "entry_table.h"

// The only place that reads the clock and the only place that knows what "expired" means.
class ExpiryRule {
 public:
  explicit ExpiryRule(std::shared_ptr<kv::Clock> clock) : clock_(std::move(clock)) {}

  // The absolute tick at which a value stored now with this ttl stops being readable.
  long long expiryFor(long long ttl) const { return clock_->now() + ttl; }

  bool isLive(const Entry& entry) const { return !entry.expiresAt.has_value() || clock_->now() < *entry.expiresAt; }

  std::optional<long long> remaining(const Entry& entry) const {
    if (!entry.expiresAt.has_value() || !isLive(entry)) return std::nullopt;
    return *entry.expiresAt - clock_->now();
  }

 private:
  std::shared_ptr<kv::Clock> clock_;
};
