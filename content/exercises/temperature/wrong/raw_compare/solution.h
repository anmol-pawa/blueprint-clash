#pragma once
#include <cmath>
#include <optional>

enum class Unit { Celsius, Fahrenheit, Kelvin };

inline const char* toString(Unit u) {
  switch (u) {
    case Unit::Celsius: return "C";
    case Unit::Fahrenheit: return "F";
    case Unit::Kelvin: return "K";
  }
  return "?";
}

class Temperature {
 public:
  static std::optional<Temperature> make(double value, Unit unit) {
    Temperature t(value, unit);
    if (t.kelvin() < 0.0) return std::nullopt;  // below absolute zero
    return t;
  }

  double in(Unit target) const {
    const double k = kelvin();
    switch (target) {
      case Unit::Kelvin: return k;
      case Unit::Celsius: return k - 273.15;
      case Unit::Fahrenheit: return (k - 273.15) * 9.0 / 5.0 + 32.0;
    }
    return k;
  }

  Unit unit() const { return unit_; }

  bool operator<(const Temperature& other) const { return value_ < other.value_; }  // compares raw numbers
  bool operator==(const Temperature& other) const { return value_ == other.value_ && unit_ == other.unit_; }

 private:
  Temperature(double value, Unit unit) : value_(value), unit_(unit) {}

  double kelvin() const {
    switch (unit_) {
      case Unit::Kelvin: return value_;
      case Unit::Celsius: return value_ + 273.15;
      case Unit::Fahrenheit: return (value_ - 32.0) * 5.0 / 9.0 + 273.15;
    }
    return value_;
  }

  double value_;
  Unit unit_;
};
