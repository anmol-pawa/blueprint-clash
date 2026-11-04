#pragma once
#include <cstddef>
#include <string>

// The component interface every wrapper and the real destination share.
class Writer {
 public:
  virtual ~Writer() = default;
  virtual void write(const std::string& text) = 0;
  // Pushes buffered data towards the real destination.
  virtual void flush() = 0;
};

// The real destination for tests and demos: remembers what it received.
class MemoryWriter final : public Writer {
 public:
  void write(const std::string& text) override {
    text_ += text;
    ++writes_;
  }
  void flush() override { ++flushes_; }
  const std::string& text() const { return text_; }
  std::size_t writes() const { return writes_; }
  std::size_t flushes() const { return flushes_; }

 private:
  std::string text_;
  std::size_t writes_ = 0;
  std::size_t flushes_ = 0;
};
