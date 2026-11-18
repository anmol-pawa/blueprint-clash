#pragma once

// How a job repeats: never (period 0) or every `period` ticks at a fixed rate.
class Cadence {
 public:
  explicit Cadence(long long period = 0) : period_(period) {}

  bool repeats() const { return period_ > 0; }
  long long period() const { return period_; }
  long long after(long long at) const { return at + period_; }

 private:
  long long period_;
};
