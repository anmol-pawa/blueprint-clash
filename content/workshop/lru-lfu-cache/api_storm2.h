#pragma once
// Change Storm 2 lets the application hear about entries leaving the cache. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace cachex {

enum class RemovalReason {
  Evicted,  // pushed out by the eviction policy to make room
  Erased    // removed by an explicit erase()
};

// Told about every entry that leaves the cache, with the value it held. Replacing a value is not a removal.
// By the time onRemoved() runs the entry is already gone: contains(key) is false and size() has already dropped.
// For an eviction this happens before the new key is stored, so the cache never holds more than its capacity,
// even for an instant a listener could observe.
class RemovalListener {
 public:
  virtual ~RemovalListener() = default;
  virtual void onRemoved(const std::string& key, const std::string& value, RemovalReason reason) = 0;
};

class ObservableCache : public Cache {
 public:
  // The listener replaces any earlier one; null removes it. It only hears about removals after it is set.
  virtual void setListener(std::shared_ptr<RemovalListener> listener) = 0;
};

// Like makePolicyCache(), plus a listener hook. Returns nullptr when capacity is less than 1 or the policy is null.
std::unique_ptr<ObservableCache> makeObservableCache(int capacity, std::unique_ptr<EvictionPolicy> policy);

}  // namespace cachex
