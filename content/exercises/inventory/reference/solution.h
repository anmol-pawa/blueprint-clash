#pragma once
#include <cstddef>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include "api.h"

class Inventory {
 public:
  bool add(std::unique_ptr<Item> item) {
    if (!item) return false;
    auto [slot, inserted] = items_.try_emplace(item->name);
    if (!inserted) return false;  // `item` is still ours here and is freed on return
    slot->second = std::move(item);
    return true;
  }

  const Item* find(const std::string& name) const {
    auto it = items_.find(name);
    return it == items_.end() ? nullptr : it->second.get();
  }

  std::unique_ptr<Item> take(const std::string& name) {
    auto it = items_.find(name);
    if (it == items_.end()) return nullptr;
    std::unique_ptr<Item> out = std::move(it->second);
    items_.erase(it);
    return out;
  }

  std::size_t size() const { return items_.size(); }

 private:
  std::map<std::string, std::unique_ptr<Item>> items_;  // sole owner of every stored Item
};
