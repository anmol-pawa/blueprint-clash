#pragma once
#include <optional>

// TODO: scoped enum, a validated factory, and comparisons that convert first.
enum class Unit { Celsius, Fahrenheit, Kelvin };
const char* toString(Unit u);

class Temperature {
 public:
  static std::optional<Temperature> make(double value, Unit unit);
  double in(Unit target) const;
  Unit unit() const;
  bool operator<(const Temperature& other) const;
  bool operator==(const Temperature& other) const;
};
