#pragma once
#include <string>
#include <vector>

#include "glob.h"
#include "node.h"

// Depth-first walk of a directory tree collecting the entries whose name matches. Links are listed, never entered.
class Finder {
 public:
  explicit Finder(Glob glob) : glob_(std::move(glob)) {}

  void collect(const Directory& dir, const std::string& base, std::vector<std::string>& found) const {
    for (const auto& entry : dir.children()) {
      const std::string path = (base == "/" ? "" : base) + "/" + entry.first;
      if (glob_.matches(entry.first)) found.push_back(path);
      const Directory* sub = entry.second->asDirectory();
      if (sub != nullptr) collect(*sub, path, found);
    }
  }

 private:
  Glob glob_;
};
