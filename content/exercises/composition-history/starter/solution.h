#pragma once
#include <cstddef>
#include <string>
#include <vector>

// TODO: do not inherit std::vector. Hold the storage as a private member and enforce the capacity.
class BoundedHistory : public std::vector<std::string> {
 public:
  explicit BoundedHistory(std::size_t capacity) : capacity_(capacity) {}
  void add(const std::string& entry) { (void)entry; }
  std::string latest() const { return ""; }

 private:
  std::size_t capacity_;
};
