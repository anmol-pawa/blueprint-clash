#pragma once
#include <cstddef>
#include <string>

class Sink {
 public:
  virtual ~Sink() = default;

  // Non-virtual: the contract (skip empties, number lines, count) cannot be overridden away.
  void write(const std::string& message) {
    if (message.empty()) return;
    ++written_;
    emit("[" + std::to_string(written_) + "] " + message);
  }

  std::size_t written() const { return written_; }

 private:
  virtual void emit(const std::string& line) = 0;  // the only part subclasses decide

  std::size_t written_ = 0;
};
