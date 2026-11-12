#pragma once
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "api_storm1.h"

// A parsed output pattern. Parsing happens once, when the sink is added, so a bad pattern is refused up front
// and writing a record is a walk over ready-made parts. A message is inserted as text and never re-scanned.
class Pattern {
 public:
  static std::optional<Pattern> parse(const std::string& text) {
    Pattern pattern;
    std::string literal;
    for (std::size_t i = 0; i < text.size(); ++i) {
      if (text[i] != '%') {
        literal += text[i];
        continue;
      }
      if (i + 1 == text.size()) return std::nullopt;
      const char code = text[++i];
      if (code == '%') {
        literal += '%';
        continue;
      }
      Field field;
      if (code == 'l') {
        field = [](const logx::Record& r) { return std::string(logx::levelName(r.level)); };
      } else if (code == 't') {
        field = [](const logx::Record& r) { return std::to_string(r.time); };
      } else if (code == 'm') {
        field = [](const logx::Record& r) { return r.message; };
      } else {
        return std::nullopt;
      }
      pattern.flushLiteral(literal);
      pattern.parts_.push_back(Part{field, std::string()});
    }
    pattern.flushLiteral(literal);
    return pattern;
  }

  std::string render(const logx::Record& record) const {
    std::string line;
    for (const auto& part : parts_) line += part.field != nullptr ? part.field(record) : part.text;
    return line;
  }

 private:
  // A part is either fixed text or a field that reads one value from the record.
  using Field = std::string (*)(const logx::Record&);
  struct Part {
    Field field;
    std::string text;
  };

  void flushLiteral(std::string& literal) {
    if (literal.empty()) return;
    parts_.push_back(Part{nullptr, literal});
    literal.clear();
  }

  std::vector<Part> parts_;
};

// Adapts a text destination to the Record-based Sink seam, so the logger needs no idea that text exists.
class FormattingSink : public logx::Sink {
 public:
  FormattingSink(Pattern pattern, std::unique_ptr<logx::LineSink> target) : pattern_(std::move(pattern)), target_(std::move(target)) {}

  void write(const logx::Record& record) override { target_->writeLine(pattern_.render(record)); }
  void flush() override { target_->flush(); }

 private:
  Pattern pattern_;
  std::unique_ptr<logx::LineSink> target_;
};
