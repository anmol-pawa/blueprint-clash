#pragma once
#include <cstddef>
#include <string>

// One interface for both leaves and containers: callers treat a file and a whole folder the same way.
class Node {
 public:
  virtual ~Node() = default;
  virtual const std::string& name() const = 0;
  // Bytes: a file's own size, or the total of everything below a directory.
  virtual long long size() const = 0;
  // Number of files at or below this node (a file counts itself as 1).
  virtual std::size_t fileCount() const = 0;
  // The listing, indented two spaces per `depth` level.
  virtual std::string render(int depth = 0) const = 0;
  // Resolve a relative path like "src/util/a.h" below this node. An empty path means this node.
  // Returns nullptr when nothing is there.
  virtual const Node* find(const std::string& path) const = 0;
};
