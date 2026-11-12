#pragma once
#include <string>

#include "api.h"

// Turns a record into the one line every sink receives. The only place that knows the line layout.
class LineFormatter {
 public:
  std::string format(logx::Level level, const std::string& category, const std::string& message) const {
    static const char* const kNames[] = {"DEBUG", "INFO", "WARN", "ERROR"};
    std::string line = std::string("[") + kNames[static_cast<int>(level)] + "] ";
    if (!category.empty()) line += category + ": ";
    return line + message;
  }
};
