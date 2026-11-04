import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "builder-request",
  title: "HTTP request builder: only valid requests can exist",
  concepts: ["builder", "fluent interface", "immutable value object", "validation at the boundary"],
  hints: [
    "Who may create an `HttpRequest`? If only the builder can, then every request that exists was validated. Make the constructor private and befriend the builder.",
    "The builder keeps defaults in its own members. Each setter returns `*this`. `build()` checks all the rules, then copies the fields into a new `HttpRequest` (build is const, so the builder stays reusable).",
    "For headers, scan for a case-insensitive match before appending: `std::tolower(static_cast<unsigned char>(c))` on both sides. Replace the value in place if found.",
  ],
  wrong: [
    { dir: "public_ctor", failingTests: ["Shape.RequestHasNoPublicConstructorButIsCopyable"], reason: "Leaves a public default constructor, so callers can create half-built, unvalidated requests and the builder is optional ceremony." },
    { dir: "no_validation", failingTests: ["Validation.UrlIsRequiredAndMustBeHttp", "Validation.MethodMustBeKnown", "Validation.TimeoutRangeIsInclusive", "Headers.EmptyNameIsInvalid"], reason: "build() accepts anything, so the builder gives a fluent syntax but none of the safety that justifies the pattern." },
    { dir: "duplicate_headers", failingTests: ["Headers.NamesAreCaseInsensitiveAndReplaceInPlace"], reason: "Appends a second header instead of replacing, so a request can carry two Content-Type headers." },
    { dir: "allows_get_body", failingTests: ["Validation.BodyNeedsPostOrPut"], reason: "Skips the cross-field rule (body only with POST or PUT); the pattern's real value is checking relationships between fields at one place." },
  ],
};
