A bare `double` tagged with a hope that it is Celsius has lost more than one probe to a mix-up. Write the types in `solution.h`:

- `enum class Unit { Celsius, Fahrenheit, Kelvin };` (a scoped enum: it must not convert to `int` implicitly) and `const char* toString(Unit)` returning `"C"`, `"F"`, `"K"`.
- `class Temperature` with `static std::optional<Temperature> make(double value, Unit unit)`: refuses anything below absolute zero (-273.15 C, -459.67 F, 0 K) and returns `std::nullopt`.
- `double in(Unit target) const` converts (C to F is `c * 9 / 5 + 32`; K is C + 273.15).
- `Unit unit() const` is the unit it was created with.
- `bool operator<(const Temperature&) const` compares the *physical* temperatures, whatever their units; `bool operator==` likewise (within 1e-9 K).
