#pragma once
#include <cstddef>
#include <deque>
#include <string>

class BoundedHistory {
 public:
  explicit BoundedHistory(std::size_t capacity) : capacity_(capacity) {}
  void add(const std::string& entry) {
    if (items_.size() >= capacity_) return;  // drops the new entry, not the oldest
    items_.push_back(entry);
  }
  std::size_t size() const { return items_.size(); }
  const std::string& at(std::size_t index) const { return items_[index]; }
  std::string latest() const { return items_.empty() ? std::string() : items_.back(); }

 private:
  std::size_t capacity_;
  std::deque<std::string> items_;
};
