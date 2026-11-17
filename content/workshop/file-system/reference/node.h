#pragma once
#include <map>
#include <memory>
#include <string>
#include <utility>

#include "path.h"

class Directory;
class File;
class Link;

// One entry in the tree (Composite). A node does not know its own name: its directory holds it under one.
class Node {
 public:
  virtual ~Node() = default;
  virtual fs::Kind kind() const = 0;
  virtual std::size_t bytes() const = 0;
  // Safe downcasts: null unless this node is that kind.
  virtual Directory* asDirectory() { return nullptr; }
  virtual File* asFile() { return nullptr; }
  virtual Link* asLink() { return nullptr; }
};

class File : public Node {
 public:
  explicit File(std::string content) : content_(std::move(content)) {}
  fs::Kind kind() const override { return fs::Kind::File; }
  std::size_t bytes() const override { return content_.size(); }
  File* asFile() override { return this; }
  const std::string& content() const { return content_; }
  void assign(std::string content) { content_ = std::move(content); }

 private:
  std::string content_;
};

// A symbolic link holds the path it stands for. It owns no content, so it counts as zero bytes.
class Link : public Node {
 public:
  explicit Link(Path target) : target_(std::move(target)) {}
  fs::Kind kind() const override { return fs::Kind::Link; }
  std::size_t bytes() const override { return 0; }
  Link* asLink() override { return this; }
  const Path& target() const { return target_; }

 private:
  Path target_;
};

class Directory : public Node {
 public:
  using Children = std::map<std::string, std::unique_ptr<Node>>;

  fs::Kind kind() const override { return fs::Kind::Directory; }
  std::size_t bytes() const override {
    std::size_t total = 0;
    for (const auto& entry : children_) total += entry.second->bytes();
    return total;
  }
  Directory* asDirectory() override { return this; }

  const Children& children() const { return children_; }
  bool empty() const { return children_.empty(); }
  Node* find(const std::string& name) const {
    const auto it = children_.find(name);
    return it == children_.end() ? nullptr : it->second.get();
  }
  void put(const std::string& name, std::unique_ptr<Node> node) { children_[name] = std::move(node); }
  std::unique_ptr<Node> take(const std::string& name) {
    std::unique_ptr<Node> node = std::move(children_[name]);
    children_.erase(name);
    return node;
  }

  // True when `wanted` is this directory or anywhere below it (links are not entered).
  bool holds(const Node* wanted) const {
    if (wanted == this) return true;
    for (const auto& entry : children_) {
      const Directory* sub = entry.second->asDirectory();
      if (sub != nullptr && sub->holds(wanted)) return true;
    }
    return false;
  }

 private:
  Children children_;
};
