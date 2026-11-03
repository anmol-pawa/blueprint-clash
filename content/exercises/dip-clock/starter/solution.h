#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include "api.h"

// TODO: use the injected Clock (and own it); never read the system clock here.
class SessionStore {
 public:
  SessionStore(std::unique_ptr<Clock> clock, long long ttlSeconds) {
    (void)clock;
    (void)ttlSeconds;
  }
  std::string open(const std::string& user) {
    (void)user;
    return "";
  }
  bool isValid(const std::string& token) const {
    (void)token;
    return false;
  }
  std::size_t activeCount() const { return 0; }
};
