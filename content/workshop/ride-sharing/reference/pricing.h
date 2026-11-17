#pragma once
#include "api.h"

// What a trip of a given length costs once the surge multiplier is known.
class Tariff {
 public:
  static ride::Money fare(long long distance, int surgePercent) {
    const ride::Money plain = ride::kBaseFare + ride::kFarePerUnit * distance;
    return plain * surgePercent / kPercentBase;
  }
  static constexpr int kPercentBase = 100;
};

// Strategy: how much more a trip costs right now, as a percentage of the plain fare (100 means no surge).
class SurgePolicy {
 public:
  virtual ~SurgePolicy() = default;
  virtual int percentFor(int availableDrivers) const = 0;
};

class NoSurge : public SurgePolicy {
 public:
  int percentFor(int) const override { return Tariff::kPercentBase; }
};

class ScarcitySurge : public SurgePolicy {
 public:
  ScarcitySurge(int freeDriverThreshold, int surgePercent) : threshold_(freeDriverThreshold), percent_(surgePercent) {}
  static bool isValid(int freeDriverThreshold, int surgePercent) {
    return freeDriverThreshold >= 0 && surgePercent >= Tariff::kPercentBase && surgePercent <= kMaxPercent;
  }
  int percentFor(int availableDrivers) const override {
    return availableDrivers <= threshold_ ? percent_ : Tariff::kPercentBase;
  }

 private:
  static constexpr int kMaxPercent = 500;
  int threshold_;
  int percent_;
};
