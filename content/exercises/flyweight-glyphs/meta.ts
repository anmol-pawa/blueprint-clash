import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "flyweight-glyphs",
  title: "Flyweight: share the immutable part, keep the position outside",
  concepts: ["flyweight", "intrinsic vs extrinsic state", "factory-managed cache", "immutability", "shared_ptr<const T>"],
  hints: [
    "Split the state first. What makes a glyph a glyph (character, font, size) is intrinsic and shareable. Where it sits on the line is extrinsic: it changes per use, so it must live in the line, not in the glyph.",
    "Keep a `std::map` in the factory keyed by `std::tuple<char, std::string, int>`: look the key up, build the glyph only on a miss, and return the stored `shared_ptr<const Glyph>`. Every part of the key must be in the tuple.",
    "In `TextLine`, track a running x: each placed glyph gets the current x, then x grows by that glyph's advance. `width()` is that final x. Do not sum over distinct glyphs: a shared glyph is still drawn at every place it appears.",
  ],
  wrong: [
    { dir: "new_each_time", failingTests: ["Flyweight.SameKeyReturnsTheSameObject", "TextLine.LongTextBuildsOnlyTheDistinctGlyphs", "TextLine.LinesFromTheSameFactoryShareGlyphs"], reason: "Stores glyphs in the map but never looks them up, so every request builds a new object: a cache that is written and never read, and exactly the memory blow-up the pattern exists to prevent." },
    { dir: "key_ignores_size", failingTests: ["Flyweight.AnyDifferenceInTheKeyGivesADifferentGlyph", "TextLine.MixedStylesKeepTheRunningPosition"], reason: "The cache key leaves out the size, so a 20px 'a' request returns the 10px glyph: sharing objects whose intrinsic state differs corrupts every later use." },
    { dir: "key_ignores_font", failingTests: ["Flyweight.AnyDifferenceInTheKeyGivesADifferentGlyph", "TextLine.MixedStylesKeepTheRunningPosition"], reason: "The key omits the font, so a Serif request silently gets the Mono glyph. Every field of the intrinsic state must be part of the identity." },
    { dir: "width_counts_distinct", failingTests: ["TextLine.WidthCountsEveryPlacementNotEveryDistinctGlyph"], reason: "Adds a glyph's advance only the first time it is seen because 'it is shared', confusing the number of objects with the number of places the glyph is drawn." },
  ],
};
