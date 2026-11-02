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
    for (const auto& w : other.items_) items_.push_back(w);
  }
  Panel& operator=(const Panel& other) {
    Panel copy(other);  // copy first: if anything fails, *this is untouched
    items_.swap(copy.items_);
    return *this;
  }
  Panel(Panel&&) noexcept = default;
  Panel& operator=(Panel&&) noexcept = default;
  ~Panel() = default;

  void add(std::unique_ptr<Widget> w) {
    if (w) items_.push_back(std::shared_ptr<Widget>(std::move(w)));
  }
  std::size_t size() const { return items_.size(); }
  Widget* at(std::size_t i) { return items_[i].get(); }
  const Widget* at(std::size_t i) const { return items_[i].get(); }

 private:
  std::vector<std::shared_ptr<Widget>> items_;
};
