#pragma once
#include <cstddef>
#include <optional>
#include <vector>

// TODO: implement with a std::vector<T>. Think about which overloads move and which copy.
template <typename T>
class Stack {
 public:
  void push(const T& value);
  void push(T&& value);
  std::optional<T> pop();
  const T* peek() const;
  std::size_t size() const;
  bool empty() const;
};
