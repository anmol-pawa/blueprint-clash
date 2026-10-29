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
    const std::string name = item->name;
    items_[name] = item.release();  // raw pointer, and nobody ever deletes it
    return true;
  }
  const Item* find(const std::string& name) const {
    auto it = items_.find(name);
    return it == items_.end() ? nullptr : it->second;
  }
  std::unique_ptr<Item> take(const std::string& name) {
    auto it = items_.find(name);
    if (it == items_.end()) return nullptr;
    std::unique_ptr<Item> out(it->second);
    items_.erase(it);
    return out;
  }
  std::size_t size() const { return items_.size(); }

 private:
  std::map<std::string, Item*> items_;
};
