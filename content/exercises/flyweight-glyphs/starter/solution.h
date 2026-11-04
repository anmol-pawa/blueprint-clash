#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include <vector>
#include "api.h"

// TODO: GlyphFactory::get must return the SAME shared_ptr<const Glyph> for the same (ch, font, size).
// Hint: a std::map keyed by a std::tuple<char, std::string, int> is enough.
class GlyphFactory {
 public:
  std::shared_ptr<const Glyph> get(char ch, const std::string& font, int size) {
    return std::make_shared<const Glyph>(ch, font, size);
  }
  std::size_t cachedCount() const { return 0; }
};

struct Placed {
  std::shared_ptr<const Glyph> glyph;
  int x = 0;
};

// TODO: a line of placed glyphs. The x position is extrinsic: store it here, not in Glyph.
class TextLine {
 public:
  explicit TextLine(GlyphFactory& factory) : factory_(factory) {}
  void append(const std::string&, const std::string&, int) {}
  std::size_t length() const { return 0; }
  const Placed& at(std::size_t i) const { return placed_.at(i); }
  int width() const { return 0; }

 private:
  GlyphFactory& factory_;
  std::vector<Placed> placed_;
};
