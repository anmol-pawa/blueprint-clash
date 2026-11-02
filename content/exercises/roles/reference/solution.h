#pragma once
#include <string>
#include <utility>
#include "api.h"

class Notebook final : public Readable, public Writable {
 public:
  std::string read() const override { return text_; }
  void write(const std::string& text) override { text_ += text; }

 private:
  std::string text_;
};

// Read-only by type: there is no write() to stub out or to misuse.
class Sensor final : public Readable {
 public:
  explicit Sensor(std::string reading) : reading_(std::move(reading)) {}
  std::string read() const override { return reading_; }

 private:
  std::string reading_;
};

// Depends on the narrowest interfaces it needs, one per side.
inline void archive(const Readable& from, Writable& to) { to.write(from.read()); }
