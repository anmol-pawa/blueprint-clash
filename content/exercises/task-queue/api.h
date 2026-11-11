#pragma once
#include <functional>
#include <mutex>

// The seam between your code and the operating system's lock (production wraps a std::mutex; the tests pass a spy).
// It satisfies the standard Lockable requirements, so std::lock_guard<Lock> works on it directly.
class Lock {
 public:
  virtual ~Lock() = default;
  virtual void lock() = 0;
  virtual void unlock() = 0;
  virtual bool try_lock() = 0;
};

// The seam for a condition variable. wait() atomically releases `lock`, sleeps, and takes `lock` again before
// it returns. It may return spuriously (nothing changed), so callers must re-check their predicate.
class Condition {
 public:
  virtual ~Condition() = default;
  virtual void wait(Lock& lock) = 0;
  virtual void notifyOne() = 0;
  virtual void notifyAll() = 0;
};

using Task = std::function<void()>;
