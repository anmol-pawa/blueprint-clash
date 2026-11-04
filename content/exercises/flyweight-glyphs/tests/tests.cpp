#include <memory>
#include <string>
#include <type_traits>
#include "bp_test.h"
#include "solution.h"

namespace {
int built() { return Glyph::constructed(); }
}  // namespace

TEST(Flyweight, SameKeyReturnsTheSameObject) {
  GlyphFactory f;
  const int before = built();
  auto a = f.get('a', "Mono", 12);
  auto b = f.get('a', "Mono", 12);
  EXPECT_TRUE(a.get() == b.get());
  EXPECT_EQ(built() - before, 1);
  EXPECT_EQ(f.cachedCount(), static_cast<std::size_t>(1));
}

TEST(Flyweight, AnyDifferenceInTheKeyGivesADifferentGlyph) {
  GlyphFactory f;
  auto base = f.get('a', "Mono", 12);
  EXPECT_TRUE(base.get() != f.get('b', "Mono", 12).get());
  EXPECT_TRUE(base.get() != f.get('a', "Serif", 12).get());
  EXPECT_TRUE(base.get() != f.get('a', "Mono", 14).get());
  EXPECT_EQ(f.cachedCount(), static_cast<std::size_t>(4));
  EXPECT_EQ(f.get('a', "Serif", 12)->font(), std::string("Serif"));
  EXPECT_EQ(f.get('a', "Mono", 14)->size(), 14);
}

TEST(Flyweight, TheSharedGlyphIsImmutable) {
  GlyphFactory f;
  static_assert(std::is_same<decltype(f.get('a', "Mono", 12)), std::shared_ptr<const Glyph>>::value,
                "the factory must hand out shared_ptr<const Glyph>");
  EXPECT_EQ(f.get('z', "Mono", 10)->ch(), 'z');
}

TEST(TextLine, LongTextBuildsOnlyTheDistinctGlyphs) {
  GlyphFactory f;
  TextLine line(f);
  const int before = built();
  std::string text;
  for (int i = 0; i < 100; ++i) text += "hello world ";
  line.append(text, "Mono", 10);
  EXPECT_EQ(line.length(), static_cast<std::size_t>(1200));
  EXPECT_EQ(f.cachedCount(), static_cast<std::size_t>(8));  // h e l o ' ' w r d
  EXPECT_EQ(built() - before, 8);
  EXPECT_TRUE(line.at(0).glyph.get() == line.at(12).glyph.get());
}

TEST(TextLine, PositionIsExtrinsicState) {
  GlyphFactory f;
  TextLine line(f);
  line.append("aab", "Mono", 10);  // advance 6 each
  EXPECT_EQ(line.at(0).x, 0);
  EXPECT_EQ(line.at(1).x, 6);
  EXPECT_EQ(line.at(2).x, 12);
  EXPECT_TRUE(line.at(0).glyph.get() == line.at(1).glyph.get());  // shared glyph, different positions
}

TEST(TextLine, WidthCountsEveryPlacementNotEveryDistinctGlyph) {
  GlyphFactory f;
  TextLine line(f);
  line.append("aaaa", "Mono", 10);
  EXPECT_EQ(line.width(), 24);
  EXPECT_EQ(f.cachedCount(), static_cast<std::size_t>(1));
}

TEST(TextLine, MixedStylesKeepTheRunningPosition) {
  GlyphFactory f;
  TextLine line(f);
  line.append("ab", "Mono", 10);   // advance 6 -> x 0, 6
  line.append("ab", "Mono", 20);   // advance 12 -> x 12, 24
  line.append("a", "Serif", 10);   // x 36
  EXPECT_EQ(line.at(2).x, 12);
  EXPECT_EQ(line.at(3).x, 24);
  EXPECT_EQ(line.at(4).x, 36);
  EXPECT_EQ(line.width(), 42);
  EXPECT_EQ(f.cachedCount(), static_cast<std::size_t>(5));
}

TEST(TextLine, LinesFromTheSameFactoryShareGlyphs) {
  GlyphFactory f;
  TextLine first(f);
  TextLine second(f);
  first.append("abc", "Mono", 10);
  const int before = built();
  second.append("cba", "Mono", 10);
  EXPECT_EQ(built() - before, 0);
  EXPECT_TRUE(first.at(0).glyph.get() == second.at(2).glyph.get());
  EXPECT_EQ(second.at(1).x, 6);
}

TEST(TextLine, EmptyTextAddsNothing) {
  GlyphFactory f;
  TextLine line(f);
  line.append("", "Mono", 10);
  EXPECT_EQ(line.length(), static_cast<std::size_t>(0));
  EXPECT_EQ(line.width(), 0);
}
