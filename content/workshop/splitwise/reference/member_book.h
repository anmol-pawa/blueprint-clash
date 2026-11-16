#pragma once
#include <set>
#include <string>

// The people in the group. Knows nothing about money.
class MemberBook {
 public:
  bool add(const std::string& id) { return !id.empty() && ids_.insert(id).second; }
  bool has(const std::string& id) const { return ids_.count(id) > 0; }

 private:
  std::set<std::string> ids_;
};
