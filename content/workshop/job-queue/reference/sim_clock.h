#pragma once

// The queue's idea of "now": simulated ticks that only move when told to.
class SimClock {
 public:
  long long now() const { return now_; }
  void set(long long time) { now_ = time; }

 private:
  long long now_ = 0;
};
