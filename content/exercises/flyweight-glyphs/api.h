#pragma once
#include <string>
#include <utility>

// Intrinsic state only: what a glyph *is*. It never knows where it is drawn, so one object can be shared.
class Glyph {
 public:
  Glyph(char ch, std::string font, int size) : ch_(ch), font_(std::move(font)), size_(size) { ++constructed(); }
  char ch() const { return ch_; }
  const std::string& font() const { return font_; }
  int size() const { return size_; }
  // Horizontal space the glyph takes, in whole pixels (60% of the size, rounded down).
  int advance() const { return size_ * 6 / 10; }

  // How many Glyph objects have ever been built. Tests use it to prove that sharing really happens.
  static int& constructed() {
    static int count = 0;
    return count;
  }

 private:
  char ch_;
  std::string font_;
  int size_;
};
