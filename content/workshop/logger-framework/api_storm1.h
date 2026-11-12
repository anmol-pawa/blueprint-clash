#pragma once
// Change Storm 1 adds per-category levels. Everything from api.h still holds, and makeLogger() keeps
// working as before. Only loggers made by makeConfigurableLogger() have the new operations.
#include "api.h"

namespace logx {

class ConfigurableLogger : public Logger {
 public:
  // Gives a category (and every category below it) its own minimum level, replacing the logger-wide one.
  // Categories are dot-separated paths: "db" governs "db", "db.pool" and "db.pool.reaper", but not "dbx".
  // The most specific rule wins: with rules on "db" and "db.pool", "db.pool.x" follows "db.pool".
  // A category with no rule on it or above it follows the logger-wide level (setLevel).
  // A rule may be more verbose or less verbose than the logger-wide level.
  // Setting a rule again replaces it. Returns false (and changes nothing) for an empty name.
  virtual bool setCategoryLevel(const std::string& category, Level level) = 0;

  // Removes the rule on exactly this category; its children fall back to the next rule up.
  // Does nothing if there is no such rule.
  virtual void clearCategoryLevel(const std::string& category) = 0;
};

std::unique_ptr<ConfigurableLogger> makeConfigurableLogger(std::unique_ptr<Clock> clock);

}  // namespace logx
