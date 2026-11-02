#pragma once
#include <cstddef>
#include <memory>
#include <vector>
#include "api.h"

// TODO: add a deep copy constructor and copy assignment that clone every widget.
class Panel {
 public:
  void add(std::unique_ptr<Widget> w) {
    if (w) items_.push_back(std::move(w));
  }
  std::size_t size() const { return items_.size(); }
  Widget* at(std::size_t i) { return items_[i].get(); }
  const Widget* at(std::size_t i) const { return items_[i].get(); }

 private:
  std::vector<std::unique_ptr<Widget>> items_;
};
