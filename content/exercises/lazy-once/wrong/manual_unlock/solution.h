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
    lock_.lock();
    if (!ready_.load(std::memory_order_relaxed)) {  // re-check under the lock
      int loaded = 0;
      if (!loader_.load(loaded)) return false;  // not cached: the next caller retries
      value_ = loaded;
      ready_.store(true, std::memory_order_release);  // publish only after value_ is written
    }
    out = value_;
    lock_.unlock();
    return true;
  }

 private:
  Lock& lock_;
  Loader& loader_;
  int value_ = 0;                 // written once, under lock_, before ready_ is set
  std::atomic<bool> ready_{false};
};
