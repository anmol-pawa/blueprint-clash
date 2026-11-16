#pragma once
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "admission.h"
#include "client_policies.h"

// The public face. It validates the request, reads the clock once, gathers the policies that apply and lets
// Admission decide. It has no rule of its own about buckets, windows or layers.
class LimiterImpl : public rl::RateLimiter {
 public:
  LimiterImpl(std::shared_ptr<rl::Clock> clock, ClientPolicies::Factory perClient, std::unique_ptr<LimitPolicy> global = nullptr)
      : clock_(std::move(clock)), clients_(std::move(perClient)), global_(std::move(global)) {}

  rl::Decision tryAcquire(const std::string& client, long long permits) override {
    if (permits <= 0) return {false, 0};
    std::vector<LimitPolicy*> applicable{&clients_.forClient(client)};
    if (global_ != nullptr) applicable.push_back(global_.get());
    return Admission::decide(applicable, permits, clock_->now());
  }

 private:
  std::shared_ptr<rl::Clock> clock_;
  ClientPolicies clients_;
  std::unique_ptr<LimitPolicy> global_;
};
