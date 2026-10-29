#include <cmath>
#include <type_traits>
#include "bp_test.h"
#include "solution.h"

namespace {
bool near(double a, double b) { return std::fabs(a - b) < 1e-6; }
Temperature must(double v, Unit u) { return *Temperature::make(v, u); }
}  // namespace

TEST(Unit, IsAScopedEnum) {
  EXPECT_FALSE((std::is_convertible<Unit, int>::value));
  EXPECT_TRUE((std::is_enum<Unit>::value));
}

TEST(Unit, ToStringNamesEachUnit) {
  EXPECT_EQ(std::string(toString(Unit::Celsius)), "C");
  EXPECT_EQ(std::string(toString(Unit::Fahrenheit)), "F");
  EXPECT_EQ(std::string(toString(Unit::Kelvin)), "K");
}

TEST(Make, AcceptsAbsoluteZeroInEveryUnit) {
  EXPECT_TRUE(Temperature::make(-273.15, Unit::Celsius).has_value());
  EXPECT_TRUE(Temperature::make(-459.67, Unit::Fahrenheit).has_value());
  EXPECT_TRUE(Temperature::make(0.0, Unit::Kelvin).has_value());
}

TEST(Make, RefusesBelowAbsoluteZero) {
  EXPECT_FALSE(Temperature::make(-300.0, Unit::Celsius).has_value());
  EXPECT_FALSE(Temperature::make(-500.0, Unit::Fahrenheit).has_value());
  EXPECT_FALSE(Temperature::make(-0.5, Unit::Kelvin).has_value());
}

TEST(Convert, BoilingPoint) {
  Temperature t = must(100.0, Unit::Celsius);
  EXPECT_TRUE(near(t.in(Unit::Fahrenheit), 212.0));
  EXPECT_TRUE(near(t.in(Unit::Kelvin), 373.15));
  EXPECT_TRUE(near(t.in(Unit::Celsius), 100.0));
}

TEST(Convert, FromFahrenheitAndKelvin) {
  EXPECT_TRUE(near(must(32.0, Unit::Fahrenheit).in(Unit::Celsius), 0.0));
  EXPECT_TRUE(near(must(-40.0, Unit::Fahrenheit).in(Unit::Celsius), -40.0));
  EXPECT_TRUE(near(must(300.0, Unit::Kelvin).in(Unit::Celsius), 26.85));
}

TEST(Unit, RemembersTheUnitItWasMadeIn) {
  EXPECT_TRUE(must(5.0, Unit::Kelvin).unit() == Unit::Kelvin);
  EXPECT_TRUE(must(5.0, Unit::Fahrenheit).unit() == Unit::Fahrenheit);
}

TEST(Compare, ComparesPhysicalTemperatureAcrossUnits) {
  // 50 F is 10 C, which is colder than 20 C even though 50 > 20 as raw numbers.
  EXPECT_TRUE(must(50.0, Unit::Fahrenheit) < must(20.0, Unit::Celsius));
  EXPECT_FALSE(must(20.0, Unit::Celsius) < must(50.0, Unit::Fahrenheit));
  EXPECT_TRUE(must(280.0, Unit::Kelvin) < must(10.0, Unit::Celsius));
}

TEST(Compare, EqualAcrossUnits) {
  EXPECT_TRUE(must(0.0, Unit::Celsius) == must(32.0, Unit::Fahrenheit));
  EXPECT_TRUE(must(0.0, Unit::Celsius) == must(273.15, Unit::Kelvin));
  EXPECT_FALSE(must(0.0, Unit::Celsius) == must(1.0, Unit::Celsius));
  EXPECT_FALSE(must(0.0, Unit::Celsius) < must(32.0, Unit::Fahrenheit));
}
