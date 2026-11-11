#pragma once
#include <map>
#include <string>

#include "api_storm1.h"

// Owns the slots: what each sells, at what price, and how many units are left.
class SlotCatalog {
 public:
  struct Slot {
    std::string name;
    long long priceCents;
    int quantity;
  };

  vend::Status add(const std::string& id, const std::string& name, long long priceCents, int quantity) {
    if (slots_.count(id) != 0) return vend::Status::DuplicateSlot;
    if (priceCents <= 0 || quantity < 0) return vend::Status::InvalidArgument;
    slots_.emplace(id, Slot{name, priceCents, quantity});
    return vend::Status::Ok;
  }

  vend::Status restock(const std::string& id, int quantity) {
    if (quantity <= 0) return vend::Status::InvalidArgument;
    auto it = slots_.find(id);
    if (it == slots_.end()) return vend::Status::UnknownSlot;
    it->second.quantity += quantity;
    return vend::Status::Ok;
  }

  // nullptr if the slot does not exist.
  const Slot* find(const std::string& id) const {
    auto it = slots_.find(id);
    return it == slots_.end() ? nullptr : &it->second;
  }

  // Precondition: the slot exists and has at least one unit.
  void removeOne(const std::string& id) { --slots_.at(id).quantity; }

  int stockOf(const std::string& id) const {
    const Slot* slot = find(id);
    return slot == nullptr ? -1 : slot->quantity;
  }

 private:
  std::map<std::string, Slot> slots_;
};
