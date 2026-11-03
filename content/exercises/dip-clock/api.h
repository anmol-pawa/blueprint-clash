#pragma once

// Where "now" comes from. Production uses the system clock; tests use a clock they can move.
class Clock {
 public:
  virtual ~Clock() = default;
  virtual long long nowSeconds() const = 0;
};
