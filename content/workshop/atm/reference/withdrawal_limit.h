#pragma once
#include <map>
#include <string>

#include "api_storm2.h"

// A rule about how much one card may take out. The payout asks `allows` before it moves anything and calls `record` only
// after a withdrawal succeeded.
class WithdrawalLimit {
 public:
  virtual ~WithdrawalLimit() = default;
  virtual bool allows(const std::string& card, long long amount) const = 0;
  virtual void record(const std::string& card, long long amount) = 0;
  virtual void newDay() = 0;
};

class NoLimit : public WithdrawalLimit {
 public:
  bool allows(const std::string&, long long) const override { return true; }
  void record(const std::string&, long long) override {}
  void newDay() override {}
};

// Change Storm 2: a total per card per day.
class DailyLimit : public WithdrawalLimit {
 public:
  explicit DailyLimit(long long limit) : limit_(limit) {}

  bool allows(const std::string& card, long long amount) const override {
    const auto found = today_.find(card);
    const long long used = found == today_.end() ? 0 : found->second;
    return used + amount <= limit_;
  }

  void record(const std::string& card, long long amount) override { today_[card] += amount; }

  void newDay() override { today_.clear(); }

 private:
  long long limit_;
  std::map<std::string, long long> today_;
};
