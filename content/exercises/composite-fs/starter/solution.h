#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

// TODO: implement File (a leaf) and Directory (a composite that owns child Nodes).
// Directory must answer size, fileCount, render and find by delegating to its children.
class File : public Node {
 public:
  File(std::string name, long long bytes) : name_(std::move(name)), bytes_(bytes) {}
  const std::string& name() const override { return name_; }
  long long size() const override { return 0; }
  std::size_t fileCount() const override { return 0; }
  std::string render(int) const override { return ""; }
  const Node* find(const std::string&) const override { return nullptr; }

 private:
  std::string name_;
  long long bytes_;
};

class Directory : public Node {
 public:
  explicit Directory(std::string name) : name_(std::move(name)) {}
  bool add(std::unique_ptr<Node> child) {
    (void)child;
    return false;
  }
  const std::string& name() const override { return name_; }
  long long size() const override { return 0; }
  std::size_t fileCount() const override { return 0; }
  std::string render(int) const override { return ""; }
  const Node* find(const std::string&) const override { return nullptr; }

 private:
  std::string name_;
};
