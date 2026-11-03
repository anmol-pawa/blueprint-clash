#pragma once
#include <cstddef>
#include <deque>
#include <string>

// Has-a deque, not is-a vector: callers can only do what a history should allow,
// so "size() <= capacity" holds by construction.
class BoundedHistory {
 public:
  explicit BoundedHistory(std::size_t capacity) : capacity_(capacity) {}

  void add(const std::string& entry) {
    if (capacity_ == 0) return;
    if (items_.size() == capacity_) items_.pop_front();
    items_.push_back(entry);
  }

  std::size_t size() const { return items_.size(); }
  const std::string& at(std::size_t index) const { return items_[index]; }
  std::string latest() const { return items_.empty() ? std::string() : items_.back(); }

 private:
  std::size_t capacity_;
  std::deque<std::string> items_;
};
