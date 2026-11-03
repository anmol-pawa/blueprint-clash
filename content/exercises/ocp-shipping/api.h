#pragma once
#include <string>

struct Parcel {
  int grams;
  std::string country;
};

// One way of pricing a parcel. New carriers and promotions are new subclasses.
class ShippingRule {
 public:
  virtual ~ShippingRule() = default;
  // Does this rule apply to the parcel?
  virtual bool matches(const Parcel& parcel) const = 0;
  // Price in cents (only meaningful when matches() is true).
  virtual long long cents(const Parcel& parcel) const = 0;
};
