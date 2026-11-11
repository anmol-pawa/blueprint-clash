#pragma once
#include <mutex>

// The seam between your code and the operating system's lock (production passes a std::mutex wrapper;
// the tests pass a spy that records the order locks are taken). Works with std::lock_guard / std::scoped_lock.
class Lock {
 public:
  virtual ~Lock() = default;
  virtual void lock() = 0;
  virtual void unlock() = 0;
  virtual bool try_lock() = 0;
};

// An account is identified by a unique, never-changing id and guarded by its own lock.
struct Account {
  Account(int accountId, long long openingBalance, Lock& accountLock) : id(accountId), balance(openingBalance), lock(accountLock) {}
  const int id;
  long long balance;  // guarded by `lock`
  Lock& lock;
};
