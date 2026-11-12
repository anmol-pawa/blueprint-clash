#pragma once
// Public API for the Key-value store problem. The hidden tests only use what is declared here.
// You implement kv::makeStore() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <optional>
#include <string>

namespace kv {

// A source of time in whole ticks (think milliseconds). It never goes backwards.
// The store must read time only through this interface, never from the system clock.
class Clock {
 public:
  virtual ~Clock() = default;
  virtual long long now() const = 0;
};

// An in-memory map from string keys to string values, where a key can be given a time to live.
class Store {
 public:
  virtual ~Store() = default;

  // Stores the value with no expiry. If the key was there, its value is replaced and any expiry it had is cleared.
  virtual void set(const std::string& key, const std::string& value) = 0;

  // Stores the value so that it lives for `ttl` ticks: it is readable while now() < setTime + ttl and gone from
  // the tick now() == setTime + ttl onwards. Replaces any earlier value and expiry of the key.
  // A ttl of zero or less is refused: returns false and changes nothing. Returns true when stored.
  virtual bool setWithTtl(const std::string& key, const std::string& value, long long ttl) = 0;

  // The value, or an empty optional if the key was never set, was erased, or has expired.
  virtual std::optional<std::string> get(const std::string& key) const = 0;

  // Removes the key and returns true if it was live; returns false if it was absent or had already expired.
  virtual bool erase(const std::string& key) = 0;

  // The number of live keys (expired ones are not counted).
  virtual int size() const = 0;

  // Ticks left before the key expires. Empty when the key is absent, expired, or has no expiry.
  virtual std::optional<long long> ttlRemaining(const std::string& key) const = 0;
};

// Returns nullptr when the clock is null.
std::unique_ptr<Store> makeStore(std::shared_ptr<Clock> clock);

}  // namespace kv
