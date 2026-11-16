#pragma once
#include <set>
#include <string>
#include <vector>

// The people who may appear in expenses. A name is non-empty and unique.
class Members {
 public:
  bool add(const std::string& name) { return !name.empty() && names_.insert(name).second; }

  bool has(const std::string& name) const { return names_.count(name) > 0; }

  // Every name, sorted.
  std::vector<std::string> all() const { return std::vector<std::string>(names_.begin(), names_.end()); }

 private:
  std::set<std::string> names_;
};
