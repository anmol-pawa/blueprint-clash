#pragma once
#include <set>
#include <string>
#include <vector>

#include "api_storm1.h"

// A library member and the books they currently hold.
class Member {
 public:
  Member(std::string id, std::string name) : id_(std::move(id)), name_(std::move(name)) {}

  const std::string& id() const { return id_; }
  const std::string& name() const { return name_; }
  lib::Tier tier() const { return tier_; }
  void setTier(lib::Tier tier) { tier_ = tier; }
  int loanCount() const { return static_cast<int>(loans_.size()); }
  bool holds(const std::string& bookId) const { return loans_.count(bookId) != 0; }

  void addLoan(const std::string& bookId) { loans_.insert(bookId); }
  void removeLoan(const std::string& bookId) { loans_.erase(bookId); }
  std::vector<std::string> loans() const { return {loans_.begin(), loans_.end()}; }

 private:
  std::string id_;
  std::string name_;
  lib::Tier tier_ = lib::Tier::Basic;
  std::set<std::string> loans_;
};
