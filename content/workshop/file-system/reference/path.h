#pragma once
#include <algorithm>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"

// A normalised absolute path: the names from the root down, with "", "." and ".." already applied.
class Path {
 public:
  // Splits and normalises `text`. False when it is not absolute or a part is too long.
  static bool parse(const std::string& text, Path& out) {
    if (text.empty() || text[0] != '/') return false;
    std::vector<std::string> parts;
    std::size_t start = 1;
    while (start <= text.size()) {
      std::size_t end = text.find('/', start);
      if (end == std::string::npos) end = text.size();
      const std::string part = text.substr(start, end - start);
      if (part.size() > fs::kMaxNameLength) return false;
      if (part == "..") {
        if (!parts.empty()) parts.pop_back();
      } else if (!part.empty() && part != ".") {
        parts.push_back(part);
      }
      start = end + 1;
    }
    out = Path(std::move(parts));
    return true;
  }

  Path() = default;

  const std::vector<std::string>& parts() const { return parts_; }
  bool isRoot() const { return parts_.empty(); }

  // True when this path is below `ancestor` (never when they are equal).
  bool isInside(const Path& ancestor) const {
    if (parts_.size() <= ancestor.parts_.size()) return false;
    return std::equal(ancestor.parts_.begin(), ancestor.parts_.end(), parts_.begin());
  }

  std::string str() const {
    if (parts_.empty()) return "/";
    std::string out;
    for (const std::string& part : parts_) out += "/" + part;
    return out;
  }

 private:
  explicit Path(std::vector<std::string> parts) : parts_(std::move(parts)) {}
  std::vector<std::string> parts_;
};
