#pragma once
#include <cstddef>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

class Label : public Widget {
 public:
  explicit Label(std::string text) : text_(std::move(text)) {}
  std::unique_ptr<Widget> clone() const override { return std::make_unique<Label>(*this); }
  std::string describe() const override { return "label(" + text_ + ")"; }
  void setText(const std::string& text) override { text_ = text; }

 protected:
  const std::string& text() const { return text_; }

 private:
  std::string text_;
};

// A subclass must override clone() too, or copies would silently turn into plain Labels.
class Badge final : public Label {
 public:
  explicit Badge(std::string text) : Label(std::move(text)) {}
  std::unique_ptr<Widget> clone() const override { return std::make_unique<Badge>(*this); }
  std::string describe() const override { return "badge(" + text() + ")"; }
};

class Panel final : public Widget {
 public:
  explicit Panel(std::string title) : title_(std::move(title)) {}

  Panel& add(std::unique_ptr<Widget> child) {
    if (child) children_.push_back(std::move(child));
    return *this;
  }
  std::size_t size() const { return children_.size(); }
  Widget* child(std::size_t i) const { return i < children_.size() ? children_[i].get() : nullptr; }

  // Deep copy: each child clones itself, so the new panel shares no state with this one.
  std::unique_ptr<Widget> clone() const override {
    auto copy = std::make_unique<Panel>(title_);
    for (const auto& c : children_) copy->add(c->clone());
    return copy;
  }

  std::string describe() const override {
    std::string out = "panel(" + title_ + ")[";
    for (std::size_t i = 0; i < children_.size(); ++i) {
      if (i > 0) out += ",";
      out += children_[i]->describe();
    }
    return out + "]";
  }
  void setText(const std::string& text) override { title_ = text; }

 private:
  std::string title_;
  std::vector<std::unique_ptr<Widget>> children_;
};

// The registry owns its own snapshots: later edits to the caller's object do not leak in.
class Palette {
 public:
  bool add(const std::string& name, const Widget& prototype) {
    if (name.empty() || prototypes_.count(name) > 0) return false;
    prototypes_.emplace(name, prototype.clone());
    return true;
  }
  std::unique_ptr<Widget> spawn(const std::string& name) const {
    const auto it = prototypes_.find(name);
    return it == prototypes_.end() ? nullptr : it->second->clone();
  }

 private:
  std::map<std::string, std::unique_ptr<Widget>> prototypes_;
};
