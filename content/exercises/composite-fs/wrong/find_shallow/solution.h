#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

namespace detail {
inline std::string indent(int depth) { return std::string(static_cast<std::size_t>(depth > 0 ? depth : 0) * 2, ' '); }
}  // namespace detail

// Leaf: has no children, so the "container" operations degenerate to trivial answers.
class File final : public Node {
 public:
  File(std::string name, long long bytes) : name_(std::move(name)), bytes_(bytes) {}
  const std::string& name() const override { return name_; }
  long long size() const override { return bytes_; }
  std::size_t fileCount() const override { return 1; }
  std::string render(int depth) const override {
    return detail::indent(depth) + name_ + " (" + std::to_string(bytes_) + ")\n";
  }
  const Node* find(const std::string& path) const override { return path.empty() ? this : nullptr; }

 private:
  std::string name_;
  long long bytes_;
};

// Composite: owns its children and answers every question by delegating to them.
class Directory final : public Node {
 public:
  explicit Directory(std::string name) : name_(std::move(name)) {}

  bool add(std::unique_ptr<Node> child) {
    if (!child || child.get() == this) return false;
    for (const auto& existing : children_) {
      if (existing->name() == child->name()) return false;
    }
    children_.push_back(std::move(child));
    return true;
  }

  const std::string& name() const override { return name_; }
  long long size() const override {
    long long total = 0;
    for (const auto& c : children_) total += c->size();
    return total;
  }
  std::size_t fileCount() const override {
    std::size_t total = 0;
    for (const auto& c : children_) total += c->fileCount();
    return total;
  }
  std::string render(int depth) const override {
    std::string out = detail::indent(depth) + name_ + "/ (" + std::to_string(size()) + ")\n";
    for (const auto& c : children_) out += c->render(depth + 1);
    return out;
  }
  const Node* find(const std::string& path) const override {
    if (path.empty()) return this;
    const std::size_t slash = path.find('/');
    const std::string head = path.substr(0, slash);
    const std::string rest = slash == std::string::npos ? std::string() : path.substr(slash + 1);
    for (const auto& c : children_) {
      if (c->name() == path) return c.get();
    }
    return nullptr;
  }

 private:
  std::string name_;
  std::vector<std::unique_ptr<Node>> children_;
};
