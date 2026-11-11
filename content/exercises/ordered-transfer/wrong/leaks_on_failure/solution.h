#pragma once
#include <mutex>
#include "api.h"

// Lock ordering: every caller takes the lower id first, so two opposite transfers contend on the
// same first lock instead of each holding one and waiting for the other. No cycle, no deadlock.
inline bool transfer(Account& from, Account& to, long long amount) {
  if (amount <= 0 || &from == &to) return false;  // nothing shared is touched yet

  Account& first = from.id < to.id ? from : to;
  Account& second = from.id < to.id ? to : from;
  first.lock.lock();
  second.lock.lock();

  if (from.balance < amount) return false;
  from.balance -= amount;
  to.balance += amount;
  second.lock.unlock();
  first.lock.unlock();
  return true;
}
