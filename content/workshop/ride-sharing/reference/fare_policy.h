#pragma once
#include "grid.h"

// What the market looks like at the moment a trip is requested.
struct Demand {
  int online;
  int busy;
};

// What a trip costs. A Strategy: the pricing rule is the part the business keeps changing.
class FarePolicy {
 public:
  virtual ~FarePolicy() = default;
  virtual ride::Money quote(int blocks, const Demand& demand) const = 0;
};

class FlatFare : public FarePolicy {
 public:
  ride::Money quote(int blocks, const Demand& /*demand*/) const override { return standard(blocks); }

  static ride::Money standard(int blocks) { return ride::kBaseFare + ride::kFarePerBlock * blocks; }
};

// The standard fare times a multiplier that grows with the share of online drivers who are busy.
class SurgeFare : public FarePolicy {
 public:
  ride::Money quote(int blocks, const Demand& demand) const override {
    return FlatFare::standard(blocks) * multiplierPercent(demand) / kPercent;
  }

  static int multiplierPercent(const Demand& demand) {
    const int utilisation = demand.online > 0 ? demand.busy * kPercent / demand.online : 0;
    if (utilisation >= kHighLoad) return kHighMultiplier;
    if (utilisation >= kMediumLoad) return kMediumMultiplier;
    return kPercent;
  }

 private:
  static constexpr int kPercent = 100;
  static constexpr int kMediumLoad = 50;
  static constexpr int kHighLoad = 80;
  static constexpr int kMediumMultiplier = 150;
  static constexpr int kHighMultiplier = 200;
};
