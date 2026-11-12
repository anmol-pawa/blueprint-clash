#pragma once
#include <string>

#include "category_levels.h"
#include "levels.h"

// Decides whether the logger accepts a record at all: the logger-wide level, unless a category rule applies.
class LevelGate {
 public:
  void setGlobal(logx::Level level) { global_ = level; }
  bool setCategory(const std::string& name, logx::Level level) { return categories_.set(name, level); }
  void clearCategory(const std::string& name) { categories_.clear(name); }

  bool accepts(logx::Level level, const std::string& category) const {
    const auto rule = categories_.find(category);
    return levels::atLeast(level, rule ? *rule : global_);
  }

 private:
  logx::Level global_ = logx::Level::Debug;
  CategoryLevels categories_;
};
