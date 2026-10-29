import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "temperature",
  title: "Temperature: enum class and a type that cannot be wrong",
  concepts: ["enum class", "factory with validation", "std::optional", "operator overloading", "normalising to a canonical form"],
  hints: [
    "Store the value and its unit, but do all comparisons and conversions through ONE canonical unit (Kelvin) so there are only 3 conversions to get right, not 9.",
    "A private constructor plus a static `make` is how a type refuses to exist in an invalid state without exceptions.",
    "`operator<` on raw `value_` is the classic bug: 50 F is colder than 20 C. Convert both sides to Kelvin first.",
  ],
  wrong: [
    { dir: "raw_compare", failingTests: ["Compare.ComparesPhysicalTemperatureAcrossUnits", "Compare.EqualAcrossUnits"], reason: "Compares the stored numbers and ignores units: 50 F sorts above 20 C." },
    { dir: "no_floor", failingTests: ["Make.RefusesBelowAbsoluteZero"], reason: "Anything goes, including physically impossible temperatures: the validating factory is the type's whole point." },
    { dir: "bad_fahrenheit", failingTests: ["Convert.BoilingPoint"], reason: "Uses 5/9 where 9/5 is needed when converting out to Fahrenheit." },
    { dir: "unscoped_enum", failingTests: ["Unit.IsAScopedEnum"], reason: "A plain enum leaks its enumerators into the enclosing scope and converts to int implicitly, so Unit::Kelvin can silently become 2 in arithmetic." },
  ],
};
