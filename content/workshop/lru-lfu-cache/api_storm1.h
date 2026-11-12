#pragma once
// Change Storm 1: the eviction rule becomes a choice. Everything from api.h still holds.
#include "api.h"

namespace cache {

enum class Policy {
  Lru,  // evict the least recently used entry (the behaviour of makeCache)
  Lfu   // evict the least frequently used entry
};

// LFU rules:
//   - a key's use count is 1 when it is first stored;
//   - every get() hit AND every put() of an existing key adds 1 (contains() and a miss add nothing);
//   - when full, the entry with the lowest use count is evicted; among entries with the same count the
//     one used least recently goes first;
//   - an evicted or erased key forgets its count: stored again later, it starts at 1;
//   - the entry being stored is never the one evicted to make room for itself.
// With Policy::Lru this behaves exactly like makeCache. Returns nullptr if capacity < 1.
std::unique_ptr<Cache> makePolicyCache(int capacity, Policy policy);

}  // namespace cache
