#pragma once

// Decides whether a user may take more seats in a show. A Strategy so that "no limit" is not a special case in
// the booking code.
class UsagePolicy {
 public:
  virtual ~UsagePolicy() = default;
  virtual bool allows(int seatsInUse, int seatsRequested) const = 0;
};

class NoLimit : public UsagePolicy {
 public:
  bool allows(int, int) const override { return true; }
};

class PerUserCap : public UsagePolicy {
 public:
  explicit PerUserCap(int maxSeats) : maxSeats_(maxSeats) {}
  bool allows(int seatsInUse, int seatsRequested) const override { return seatsInUse + seatsRequested <= maxSeats_; }

 private:
  int maxSeats_;
};
