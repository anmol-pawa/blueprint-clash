#pragma once
#include <string>

#include "levels.h"

// Turns one record into one line. It knows the layout and nothing about where the line goes.
class LineFormat {
 public:
  std::string format(long long time, logx::Level level, const std::string& category, const std::string& message) const {
    std::string line = "[" + std::to_string(time) + "] " + levels::name(level) + " ";
    line += category.empty() ? "-" : oneLine(category);
    line += ": " + oneLine(message);
    return line;
  }

 private:
  // A line break would let a message forge a second record, so it is written out as text.
  static std::string oneLine(const std::string& text) {
    std::string out;
    out.reserve(text.size());
    for (const char c : text) {
      if (c == '\n') {
        out += "\\n";
      } else if (c == '\r') {
        out += "\\r";
      } else {
        out += c;
      }
    }
    return out;
  }
};
