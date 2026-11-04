#pragma once
#include <cstddef>
#include <map>
#include <memory>
#include <string>
#include <tuple>
#include <vector>
#include "api.h"

// Flyweight factory: the one place that decides whether a glyph already exists.
class GlyphFactory {
 public:
  std::shared_ptr<const Glyph> get(char ch, const std::string& font, int size) {
    const Key key(ch, font, 0);
    auto it = cache_.find(key);
    if (it == cache_.end()) {
      it = cache_.emplace(key, std::make_shared<const Glyph>(ch, font, size)).first;
    }
    return it->second;
  }
  std::size_t cachedCount() const { return cache_.size(); }

 private:
  using Key = std::tuple<char, std::string, int>;
  std::map<Key, std::shared_ptr<const Glyph>> cache_;
};

// Extrinsic state (the position) is stored next to the shared glyph, never inside it.
struct Placed {
  std::shared_ptr<const Glyph> glyph;
  int x = 0;
};

class TextLine {
 public:
  explicit TextLine(GlyphFactory& factory) : factory_(factory) {}

  void append(const std::string& text, const std::string& font, int size) {
    for (const char ch : text) {
      auto glyph = factory_.get(ch, font, size);
      const int advance = glyph->advance();
      placed_.push_back(Placed{std::move(glyph), width_});
      width_ += advance;
    }
  }
  std::size_t length() const { return placed_.size(); }
  const Placed& at(std::size_t i) const { return placed_.at(i); }
  int width() const { return width_; }

 private:
  GlyphFactory& factory_;
  std::vector<Placed> placed_;
  int width_ = 0;
};
