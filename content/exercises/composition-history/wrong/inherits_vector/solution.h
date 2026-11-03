#pragma once
#include <cstddef>
#include <string>
#include <vector>

class BoundedHistory : public std::vector<std::string> {
 public:
  explicit BoundedHistory(std::size_t capacity) : capacity_(capacity) {}
  void add(const std::string& entry) {
    if (capacity_ == 0) return;
    if (size() == capacity_) erase(begin());
    push_back(entry);
  }
  std::string latest() const { return empty() ? std::string() : back(); }

 private:
  std::size_t capacity_;
};
