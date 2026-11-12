#pragma once
#include <list>
#include <map>
#include <string>
#include <unordered_map>

// Decides which key to give up next. It sees keys only: never values, capacity or time.
class EvictionPolicy {
 public:
  virtual ~EvictionPolicy() = default;
  virtual void onInsert(const std::string& key) = 0;
  virtual void onAccess(const std::string& key) = 0;
  virtual void onRemove(const std::string& key) = 0;
  // Only called while at least one key is tracked.
  virtual std::string victim() const = 0;
};

// One list ordered from most to least recently used, plus an index into it, so every step is O(1).
class LruPolicy : public EvictionPolicy {
 public:
  void onInsert(const std::string& key) override {
    order_.push_front(key);
    where_[key] = order_.begin();
  }
  void onAccess(const std::string& key) override { order_.splice(order_.begin(), order_, where_.at(key)); }
  void onRemove(const std::string& key) override {
    order_.erase(where_.at(key));
    where_.erase(key);
  }
  std::string victim() const override { return order_.back(); }

 private:
  std::list<std::string> order_;
  std::unordered_map<std::string, std::list<std::string>::iterator> where_;
};

// Keys grouped by use count, each group ordered from most to least recently used.
// The victim is the oldest key of the lowest group, which is the tie-break the contract asks for.
class LfuPolicy : public EvictionPolicy {
 public:
  void onInsert(const std::string& key) override { place(key, 1); }
  void onAccess(const std::string& key) override {
    const int uses = slots_.at(key).uses;
    detach(key);
    place(key, uses + 1);
  }
  void onRemove(const std::string& key) override { detach(key); }
  std::string victim() const override { return groups_.begin()->second.back(); }

 private:
  class Slot {
   public:
    Slot(int uses, std::list<std::string>::iterator position) : uses(uses), position(position) {}
    int uses;
    std::list<std::string>::iterator position;
  };

  void place(const std::string& key, int uses) {
    std::list<std::string>& group = groups_[uses];
    group.push_front(key);
    slots_.insert_or_assign(key, Slot(uses, group.begin()));
  }
  void detach(const std::string& key) {
    const Slot& slot = slots_.at(key);
    auto group = groups_.find(slot.uses);
    group->second.erase(slot.position);
    if (group->second.empty()) groups_.erase(group);
    slots_.erase(key);
  }

  std::map<int, std::list<std::string>> groups_;
  std::unordered_map<std::string, Slot> slots_;
};
