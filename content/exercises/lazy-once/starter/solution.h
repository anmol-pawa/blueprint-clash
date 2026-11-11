#pragma once
#include <atomic>
#include <mutex>
#include "api.h"

// TODO: check `ready_` without the lock, then take the lock and check again before loading.
// A failed load must not set `ready_`. Set it (release) only after `value_` is written.
class LazyValue {
 public:
  LazyValue(Lock& lock, Loader& loader) : lock_(lock), loader_(loader) {}

  bool get(int& out) {
    (void)out;
    return false;
  }

 private:
  Lock& lock_;
  Loader& loader_;
  int value_ = 0;
  std::atomic<bool> ready_{false};
};
