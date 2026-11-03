#pragma once
#include <cstddef>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include "api.h"

// Depends on the Clock abstraction, and owns the instance it is given.
class SessionStore {
 public:
  SessionStore(std::unique_ptr<Clock> clock, long long ttlSeconds)
      : clock_(std::move(clock)), ttl_(ttlSeconds) {}

  std::string open(const std::string& user) {
    (void)user;  // a real store would keep the user; this exercise only tracks lifetime
    const std::string token = "s" + std::to_string(++counter_);
    created_[token] = clock_->nowSeconds();
    return token;
  }

  bool isValid(const std::string& token) const {
    const auto it = created_.find(token);
    return it != created_.end() && clock_->nowSeconds() - it->second < ttl_;
  }

  std::size_t activeCount() const {
    std::size_t n = 0;
    for (const auto& entry : created_) {
      if (clock_->nowSeconds() - entry.second < ttl_) ++n;
    }
    return n;
  }

 private:
  std::unique_ptr<Clock> clock_;
  long long ttl_;
  int counter_ = 0;
  std::map<std::string, long long> created_;
};
