#pragma once
// Change Storm 1 makes the eviction rule pluggable. Everything from api.h still holds.
#include "api.h"

namespace cachex {

// Decides which key to give up when the cache is full. The cache owns its policy and tells it what happens;
// the policy never touches the cache's data. The calls, and only these, happen:
//   onInsert(key)  a key that was NOT in the cache has just been stored.
//   onAccess(key)  a key that IS in the cache was used: a get() hit, or a put() that replaced its value.
//   onErase(key)   a key has just left the cache, whether through erase() or through eviction.
//   chooseVictim() a put() of a new key found the cache full. Return a key that is currently in the cache.
//                  The cache then removes it, calls onErase(victim), stores the new key and calls onInsert(newKey).
// A get() miss, contains(), and an erase() of an absent key tell the policy nothing.
class EvictionPolicy {
 public:
  virtual ~EvictionPolicy() = default;
  virtual void onInsert(const std::string& key) = 0;
  virtual void onAccess(const std::string& key) = 0;
  virtual void onErase(const std::string& key) = 0;
  virtual std::string chooseVictim() = 0;
};

// Like makeCache(), but the given policy chooses the victims. makeCache(n) behaves as a least-recently-used policy.
// Returns nullptr when capacity is less than 1 or the policy is null.
std::unique_ptr<Cache> makePolicyCache(int capacity, std::unique_ptr<EvictionPolicy> policy);

}  // namespace cachex
