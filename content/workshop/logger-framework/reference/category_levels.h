#pragma once
#include <map>
#include <optional>
#include <string>

#include "api.h"

// Per-category level rules. "a.b.c" is governed by the rule on "a.b.c", else "a.b", else "a": whole
// dot-separated segments only, nearest rule first.
class CategoryLevels {
 public:
  bool set(const std::string& name, logx::Level level) {
    if (name.empty()) return false;
    rules_[name] = level;
    return true;
  }

  void clear(const std::string& name) { rules_.erase(name); }

  std::optional<logx::Level> find(const std::string& category) const {
    std::string name = category;
    while (!name.empty()) {
      const auto it = rules_.find(name);
      if (it != rules_.end()) return it->second;
      const auto dot = name.rfind('.');
      if (dot == std::string::npos) break;
      name.resize(dot);
    }
    return std::nullopt;
  }

 private:
  std::map<std::string, logx::Level> rules_;
};
