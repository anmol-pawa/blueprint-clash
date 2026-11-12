#pragma once
// Change Storm 2: entries that expire. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace cache {

// Time comes from outside so the tests can control it. Units are whatever the caller likes (ticks).
class Clock {
 public:
  virtual ~Clock() = default;
  virtual long long now() const = 0;
};

// An entry stored with putFor(key, value, ttl) at time T is alive while now() < T + ttl and expired from
// T + ttl on. An expired entry behaves as if it were not there:
//   - get() and contains() miss, erase() returns false, size() does not count it;
//   - it never costs a live entry its place: when the cache is full, expired entries are dropped first
//     and only then, if there is still no room, the eviction policy picks a live victim;
//   - storing its key again is a brand new entry (for LFU the use count starts again at 1).
// put() stores an entry that never expires, and replaces any expiry the key had before.
// get() does not extend an entry's life. putFor() with ttl <= 0 stores nothing and removes the key.
class ExpiringCache : public Cache {
 public:
  virtual void putFor(const std::string& key, int value, long long ttl) = 0;
};

// The clock must outlive the cache. Returns nullptr if capacity < 1.
std::unique_ptr<ExpiringCache> makeExpiringCache(int capacity, Policy policy, const Clock& clock);

}  // namespace cache
