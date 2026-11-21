#pragma once
#include <set>
#include <string>

constexpr std::size_t kMaxNameLength = 32;

// Names of users and ids of posts share one rule: 1 to 32 characters.
inline bool isValidName(const std::string& name) { return !name.empty() && name.size() <= kMaxNameLength; }

class UserDirectory {
 public:
  bool contains(const std::string& name) const { return names_.count(name) != 0; }
  void add(const std::string& name) { names_.insert(name); }

 private:
  std::set<std::string> names_;
};
