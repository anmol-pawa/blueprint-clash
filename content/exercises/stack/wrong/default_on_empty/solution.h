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
    if (items_.empty()) return T{};  // invents a value instead of reporting "nothing there"
    std::optional<T> top(std::move(items_.back()));
    items_.pop_back();
    return top;
  }
  const T* peek() const { return items_.empty() ? nullptr : &items_.back(); }
  std::size_t size() const { return items_.size(); }
  bool empty() const { return items_.empty(); }

 private:
  std::vector<T> items_;
};
