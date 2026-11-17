#pragma once
#include <string>

// A name pattern: '*' is any run of characters (including none), '?' is exactly one, anything else is itself.
class Glob {
 public:
  explicit Glob(std::string pattern) : pattern_(std::move(pattern)) {}

  // Linear-time matching: remember the last '*' and, on a mismatch, let it swallow one more character.
  bool matches(const std::string& name) const {
    std::size_t p = 0;
    std::size_t i = 0;
    std::size_t star = std::string::npos;
    std::size_t mark = 0;
    while (i < name.size()) {
      if (p < pattern_.size() && pattern_[p] == '*') {
        star = p++;
        mark = i;
      } else if (p < pattern_.size() && (pattern_[p] == '?' || pattern_[p] == name[i])) {
        ++p;
        ++i;
      } else if (star != std::string::npos) {
        p = star + 1;
        i = ++mark;
      } else {
        return false;
      }
    }
    while (p < pattern_.size() && pattern_[p] == '*') ++p;
    return p == pattern_.size();
  }

 private:
  std::string pattern_;
};
