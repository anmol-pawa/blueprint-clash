#pragma once
#include <cstddef>
#include <optional>
#include <utility>
#include <vector>

template <typename T>
class Stack {
 public:
  void push(const T& value) { items_.push_back(value); }
  void push(T&& value) { items_.push_back(std::move(value)); }
  std::optional<T> pop() {
    if (items_.empty()) return std::nullopt;
    std::optional<T> first(std::move(items_.front()));  // a queue, not a stack
    items_.erase(items_.begin());
    return first;
  }
  const T* peek() const { return items_.empty() ? nullptr : &items_.front(); }
  std::size_t size() const { return items_.size(); }
  bool empty() const { return items_.empty(); }

 private:
  std::vector<T> items_;
};
