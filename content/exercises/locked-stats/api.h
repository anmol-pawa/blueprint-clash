#pragma once
#include <mutex>

// The seam between your class and the operating system's lock.
// Production code passes a `StdLock`; the tests pass a spy that records every call.
// It satisfies the standard Lockable requirements, so `std::lock_guard<Lock>` and
// `std::unique_lock<Lock>` work on it directly.
class Lock {
 public:
  virtual ~Lock() = default;
  virtual void lock() = 0;
  virtual void unlock() = 0;
  virtual bool try_lock() = 0;
};

class StdLock final : public Lock {
 public:
  void lock() override { m_.lock(); }
  void unlock() override { m_.unlock(); }
  bool try_lock() override { return m_.try_lock(); }

 private:
  std::mutex m_;
};
