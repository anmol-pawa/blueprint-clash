#pragma once
#include <cstddef>
#include <map>
#include <memory>
#include <string>
#include "api.h"

// Takes the clock out of its owner and forgets to ever delete it.
class SessionStore {
 public:
  SessionStore(std::unique_ptr<Clock> clock, long long ttlSeconds) : clock_(clock.release()), ttl_(ttlSeconds) {}

  std::string open(const std::string& user) {
    (void)user;
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
  Clock* clock_;
  long long ttl_;
  int counter_ = 0;
  std::map<std::string, long long> created_;
};
