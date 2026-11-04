#pragma once
#include <cctype>
#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include "api.h"

// Shared plumbing: owns the wrapped writer and forwards flush. Each decorator adds exactly one behaviour.
class WriterDecorator : public Writer {
 public:
  void flush() override {}

 protected:
  explicit WriterDecorator(std::unique_ptr<Writer> next) : next_(std::move(next)) {}
  Writer& next() { return *next_; }

 private:
  std::unique_ptr<Writer> next_;
};

class UpperWriter final : public WriterDecorator {
 public:
  explicit UpperWriter(std::unique_ptr<Writer> next) : WriterDecorator(std::move(next)) {}
  void write(const std::string& text) override {
    std::string upper = text;
    for (char& c : upper) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
    next().write(upper);
  }
};

class TruncateWriter final : public WriterDecorator {
 public:
  TruncateWriter(std::unique_ptr<Writer> next, std::size_t maxChars)
      : WriterDecorator(std::move(next)), maxChars_(maxChars) {}
  void write(const std::string& text) override { next().write(text.substr(0, maxChars_)); }

 private:
  std::size_t maxChars_;
};

class BracketWriter final : public WriterDecorator {
 public:
  explicit BracketWriter(std::unique_ptr<Writer> next) : WriterDecorator(std::move(next)) {}
  void write(const std::string& text) override { next().write("[" + text + "]"); }
};

class CountingWriter final : public WriterDecorator {
 public:
  explicit CountingWriter(std::unique_ptr<Writer> next) : WriterDecorator(std::move(next)) {}
  void write(const std::string& text) override {
    ++writes_;
    chars_ += text.size();
    next().write(text);
  }
  std::size_t writes() const { return writes_; }
  std::size_t chars() const { return chars_; }

 private:
  std::size_t writes_ = 0;
  std::size_t chars_ = 0;
};
