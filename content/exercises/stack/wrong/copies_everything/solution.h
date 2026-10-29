#pragma once
#include <cstddef>
#include <optional>
#include <utility>
#include <vector>

template <typename T>
class Stack {
 public:
  void push(T value) { items_.push_back(value); }  // by value, then copied again into the vector
  std::optional<T> pop() {
    if (items_.empty()) return std::nullopt;
    std::optional<T> top(items_.back());  // copies out
    items_.pop_back();
    return top;
  }
  const T* peek() const { return items_.empty() ? nullptr : &items_.back(); }
  std::size_t size() const { return items_.size(); }
  bool empty() const { return items_.empty(); }

 private:
  std::vector<T> items_;
};
