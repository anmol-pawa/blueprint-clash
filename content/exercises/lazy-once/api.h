#pragma once
#include <atomic>
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

// Something slow and fallible, such as reading a config file. Returns false (and leaves `out` alone) on failure.
class Loader {
 public:
  virtual ~Loader() = default;
  virtual bool load(int& out) = 0;
};
