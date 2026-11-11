#pragma once
#include <cstddef>
#include <mutex>
#include <vector>
#include "api.h"

// One lock guards the ring buffer; two conditions separate the waiting producers from the waiting consumers.
// Every wait sits in a loop on its predicate, because a wake-up only means "look again".
class BoundedQueue {
 public:
  BoundedQueue(std::size_t capacity, Lock& lock, Condition& notFull, Condition& notEmpty)
      : slots_(capacity), lock_(lock), notFull_(notFull), notEmpty_(notEmpty) {}

  void push(int value) {
    std::lock_guard<Lock> guard(lock_);
    while (count_ == slots_.size()) notFull_.wait(lock_);
    slots_[(head_ + count_) % slots_.size()] = value;
    ++count_;
    notEmpty_.notifyOne();
  }

  int pop() {
    std::lock_guard<Lock> guard(lock_);
    while (count_ == 0) notEmpty_.wait(lock_);
    const int value = slots_[head_];
    head_ = (head_ + 1) % slots_.size();
    --count_;
    notFull_.notifyOne();
    return value;
  }

  std::size_t size() const {
    std::lock_guard<Lock> guard(lock_);
    return count_;
  }

 private:
  std::vector<int> slots_;
  Lock& lock_;
  Condition& notFull_;
  Condition& notEmpty_;
  std::size_t head_ = 0;
  std::size_t count_ = 0;
};
