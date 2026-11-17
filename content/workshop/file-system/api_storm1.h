#pragma once
// Change Storm 1 adds searching by name pattern. Everything from api.h still holds.
#include "api.h"

namespace fs {

class SearchableFileSystem : public FileSystem {
 public:
  // Finds entries below the directory `dir` whose NAME (the last part, not the whole path) matches `pattern`.
  // The pattern is matched against the whole name, case-sensitively: '*' matches any run of characters (including
  // none), '?' matches exactly one character, every other character matches itself.
  // Every level below `dir` is searched, and directories can match as well as files; `dir` itself is never a result.
  // Results are full paths (`dir` normalised, then '/', then the names down to the match), in depth-first order: a
  // directory is listed before what is inside it, and the entries of one directory come in ascending name order.
  // An empty pattern or one containing '/' is InvalidPath (checked after `dir` is parsed). Then like any lookup.
  // `found` is replaced when the call returns Ok. A search with no match is Ok with an empty result.
  virtual Status find(const std::string& dir, const std::string& pattern, std::vector<std::string>& found) const = 0;
};

std::unique_ptr<SearchableFileSystem> makeSearchableFileSystem();

}  // namespace fs
