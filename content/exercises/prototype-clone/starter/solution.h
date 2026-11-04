#pragma once
#include <cstddef>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

// TODO: implement Label, Badge, Panel and Palette. Every concrete widget overrides clone() and
// returns a deep copy of the SAME dynamic type.
class Label : public Widget {
 public:
  explicit Label(std::string text) : text_(std::move(text)) {}
  std::unique_ptr<Widget> clone() const override { return nullptr; }
  std::string describe() const override { return ""; }
  void setText(const std::string& text) override { text_ = text; }

 protected:
  std::string text_;
};

class Badge : public Label {
 public:
  explicit Badge(std::string text) : Label(std::move(text)) {}
};

class Panel : public Widget {
 public:
  explicit Panel(std::string title) : title_(std::move(title)) {}
  Panel& add(std::unique_ptr<Widget> child) {
    (void)child;
    return *this;
  }
  std::size_t size() const { return 0; }
  Widget* child(std::size_t i) const {
    (void)i;
    return nullptr;
  }
  std::unique_ptr<Widget> clone() const override { return nullptr; }
  std::string describe() const override { return ""; }
  void setText(const std::string& text) override { title_ = text; }

 private:
  std::string title_;
};

class Palette {
 public:
  bool add(const std::string& name, const Widget& prototype) {
    (void)name;
    (void)prototype;
    return false;
  }
  std::unique_ptr<Widget> spawn(const std::string& name) const {
    (void)name;
    return nullptr;
  }
};
