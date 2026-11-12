#pragma once
// Public API for the Cache problem. The hidden tests only use what is declared here.
// You implement cachex::makeCache() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <optional>
#include <string>

namespace cachex {

// Counters since the cache was created. Plain data, read through Cache::stats().
struct Stats {
  long hits = 0;       // get() calls that found the key
  long misses = 0;     // get() calls that did not
  long evictions = 0;  // entries pushed out to make room (not erased, not overwritten)
};

// A fixed-capacity in-memory cache from string keys to string values.
class Cache {
 public:
  virtual ~Cache() = default;

  // Stores the value. A new key may push the least recently used entry out to make room.
  // Putting a key that is already present replaces its value, counts as a use of that key, and never evicts.
  virtual void put(const std::string& key, const std::string& value) = 0;

  // The value, or an empty optional on a miss. A hit counts as a use of the key.
  virtual std::optional<std::string> get(const std::string& key) = 0;

  // Whether the key is present. This is a peek: it is not a use, and it is not counted in stats().
  virtual bool contains(const std::string& key) const = 0;

  // Removes the key if present and returns true; returns false when it was absent.
  virtual bool erase(const std::string& key) = 0;

  virtual int size() const = 0;
  virtual int capacity() const = 0;
  virtual Stats stats() const = 0;
};

// A cache that holds at most `capacity` entries and evicts the least recently used one.
// Returns nullptr when capacity is less than 1.
std::unique_ptr<Cache> makeCache(int capacity);

}  // namespace cachex
