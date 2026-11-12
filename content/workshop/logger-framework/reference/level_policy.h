#pragma once
#include <map>
#include <string>

#include "api.h"

// Decides whether a record is worth producing at all: the logger-wide level plus an optional level per
// dotted category. It knows nothing about sinks or line formats.
class LevelPolicy {
 public:
  void setGlobal(logx::Level threshold) { global_ = threshold; }
  logx::Level global() const { return global_; }

  void set(const std::string& category, logx::Level threshold) { byCategory_[category] = threshold; }
  bool clear(const std::string& category) { return byCategory_.erase(category) > 0; }

  bool allows(logx::Level level, const std::string& category) const {
    return static_cast<int>(level) >= static_cast<int>(thresholdFor(category));
  }

 private:
  // The level of the most specific category on the path "a.b.c" -> "a.b" -> "a", else the global level.
  logx::Level thresholdFor(const std::string& category) const {
    std::string path = category;
    while (!path.empty()) {
      const auto found = byCategory_.find(path);
      if (found != byCategory_.end()) return found->second;
      const std::size_t dot = path.rfind('.');
      path = dot == std::string::npos ? std::string() : path.substr(0, dot);
    }
    return global_;
  }

  logx::Level global_ = logx::Level::Debug;
  std::map<std::string, logx::Level> byCategory_;
};
