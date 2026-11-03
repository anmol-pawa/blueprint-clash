#pragma once
#include <chrono>
#include <cstddef>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include "api.h"

// Takes a clock but reads the system clock instead.
class SessionStore {
 public:
  SessionStore(std::unique_ptr<Clock> clock, long long ttlSeconds)
      : clock_(std::move(clock)), ttl_(ttlSeconds) {}

  std::string open(const std::string& user) {
    (void)user;
    const std::string token = "s" + std::to_string(++counter_);
    created_[token] = now();
    return token;
  }
  bool isValid(const std::string& token) const {
    const auto it = created_.find(token);
    return it != created_.end() && now() - it->second < ttl_;
  }
  std::size_t activeCount() const {
    std::size_t n = 0;
    for (const auto& entry : created_) {
      if (now() - entry.second < ttl_) ++n;
    }
    return n;
  }

 private:
  static long long now() {
    return std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count();
  }
  std::unique_ptr<Clock> clock_;
  long long ttl_;
  int counter_ = 0;
  std::map<std::string, long long> created_;
};
