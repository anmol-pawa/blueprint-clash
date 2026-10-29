#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include "api.h"

// TODO: store the items by owning pointer so nothing leaks and nothing is freed twice.
class Inventory {
 public:
  bool add(std::unique_ptr<Item> item);
  const Item* find(const std::string& name) const;
  std::unique_ptr<Item> take(const std::string& name);
  std::size_t size() const;
};
