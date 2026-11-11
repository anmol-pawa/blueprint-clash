#pragma once
#include <atomic>
#include <mutex>
#include "api.h"

// Double-checked locking: a lock-free fast path for the common (already loaded) case, and a locked
// slow path that re-checks, because another thread may have finished while this one waited.
class LazyValue {
 public:
  LazyValue(Lock& lock, Loader& loader) : lock_(lock), loader_(loader) {}

  bool get(int& out) {
    if (ready_.load(std::memory_order_acquire)) {
      out = value_;
      return true;
    }
    std::lock_guard<Lock> guard(lock_);
    if (!ready_.load(std::memory_order_relaxed)) {  // re-check under the lock
      ready_.store(true, std::memory_order_release);  // published too early
      if (!loader_.load(value_)) return false;
    }
    out = value_;
    return true;
  }

 private:
  Lock& lock_;
  Loader& loader_;
  int value_ = 0;                 // written once, under lock_, before ready_ is set
  std::atomic<bool> ready_{false};
};
