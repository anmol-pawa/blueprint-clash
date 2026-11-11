#pragma once
#include <mutex>
#include "api.h"

// TODO: lock the two accounts in ascending id order (never twice for the same account),
// check the amount and the funds while holding both, and release both on every path.
inline bool transfer(Account& from, Account& to, long long amount) {
  (void)from;
  (void)to;
  (void)amount;
  return false;
}
