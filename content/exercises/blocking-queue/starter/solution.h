#pragma once
#include <cstddef>
#include <mutex>
#include <vector>
#include "api.h"

// TODO: guard the state with the lock, make push wait while full and pop wait while empty
// (each in a loop on its predicate, on the right condition), and wake the other side after a change.
class BoundedQueue {
 public:
  BoundedQueue(std::size_t capacity, Lock& lock, Condition& notFull, Condition& notEmpty)
      : slots_(capacity), lock_(lock), notFull_(notFull), notEmpty_(notEmpty) {}

  void push(int value) { (void)value; }
  int pop() { return 0; }
  std::size_t size() const { return 0; }

 private:
  std::vector<int> slots_;
  Lock& lock_;
  Condition& notFull_;
  Condition& notEmpty_;
};
