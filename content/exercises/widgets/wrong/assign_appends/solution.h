#pragma once
#include <cstddef>
#include <memory>
#include <utility>
#include <vector>
#include "api.h"

class Panel {
 public:
  Panel() = default;
  Panel(const Panel& other) {
    items_.reserve(other.items_.size());
    for (const auto& w : other.items_) items_.push_back(w->clone());  // virtual copy keeps the real type
  }
  Panel& operator=(const Panel& other) {
    for (const auto& w : other.items_) items_.push_back(w->clone());  // bug: appends
    return *this;
  }
  Panel(Panel&&) noexcept = default;
  Panel& operator=(Panel&&) noexcept = default;
  ~Panel() = default;

  void add(std::unique_ptr<Widget> w) {
    if (w) items_.push_back(std::move(w));
  }
  std::size_t size() const { return items_.size(); }
  Widget* at(std::size_t i) { return items_[i].get(); }
  const Widget* at(std::size_t i) const { return items_[i].get(); }

 private:
  std::vector<std::unique_ptr<Widget>> items_;  // sole owner of every widget
};
