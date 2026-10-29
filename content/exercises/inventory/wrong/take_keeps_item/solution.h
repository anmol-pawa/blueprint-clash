#pragma once
#include <cstddef>
#include <map>
#include <memory>
#include <string>
#include "api.h"

class Inventory {
 public:
  bool add(std::unique_ptr<Item> item) {
    if (!item || items_.count(item->name)) return false;
    items_[item->name] = std::move(item);
    return true;
  }
  const Item* find(const std::string& name) const {
    auto it = items_.find(name);
    return it == items_.end() ? nullptr : it->second.get();
  }
  std::unique_ptr<Item> take(const std::string& name) {
    auto it = items_.find(name);
    if (it == items_.end()) return nullptr;
    // "returns" a second, fresh copy of the item and leaves the original stored
    return std::make_unique<Item>(it->second->name, it->second->quantity);
  }
  std::size_t size() const { return items_.size(); }

 private:
  std::map<std::string, std::unique_ptr<Item>> items_;
};
