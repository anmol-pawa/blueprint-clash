#pragma once
// Public API for the LRU/LFU cache problem. The hidden tests only use what is declared here.
// You implement cache::makeCache() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>

namespace cache {

// A fixed-capacity cache from string keys to int values. When it is full and a new key arrives, it gives
// up one entry. In this first version the entry it gives up is the least recently used one.
class Cache {
 public:
  virtual ~Cache() = default;

  // Stores `value` under `key`. An existing key keeps its place in the cache and gets the new value;
  // a new key may push the cache over capacity, in which case one other entry is evicted first.
  virtual void put(const std::string& key, int value) = 0;

  // Looks `key` up. On a hit it writes the value to `value` and returns true. On a miss it returns false
  // and leaves `value` untouched. A hit counts as a use of the key.
  virtual bool get(const std::string& key, int& value) = 0;

  // True if `key` is present. Asking is not a use: it must not change what gets evicted next.
  virtual bool contains(const std::string& key) const = 0;

  // Removes `key`. Returns true if it was present.
  virtual bool erase(const std::string& key) = 0;

  virtual int size() const = 0;
  virtual int capacity() const = 0;
};

// An LRU cache holding at most `capacity` entries. Returns nullptr if capacity < 1.
std::unique_ptr<Cache> makeCache(int capacity);

}  // namespace cache
