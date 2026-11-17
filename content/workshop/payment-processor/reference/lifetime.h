#pragma once
#include "api_storm2.h"

// How long a recorded answer stays valid. A Strategy: the key book asks and never looks at a clock itself.
class Lifetime {
 public:
  virtual ~Lifetime() = default;
  virtual long long stamp() const = 0;
  virtual bool expired(long long stamp) const = 0;
};

class NoExpiry : public Lifetime {
 public:
  long long stamp() const override { return 0; }
  bool expired(long long) const override { return false; }
};

class TtlLifetime : public Lifetime {
 public:
  TtlLifetime(const pay::Clock& clock, long long ttlSeconds) : clock_(clock), ttlSeconds_(ttlSeconds) {}
  long long stamp() const override { return clock_.seconds(); }
  bool expired(long long stamp) const override { return clock_.seconds() >= stamp + ttlSeconds_; }

 private:
  const pay::Clock& clock_;
  long long ttlSeconds_;
};
