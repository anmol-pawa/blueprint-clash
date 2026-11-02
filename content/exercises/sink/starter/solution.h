#pragma once
#include <cstddef>
#include <string>

// TODO: make write() a non-virtual wrapper around a private virtual emit().
class Sink {
 public:
  virtual ~Sink() = default;
  virtual void write(const std::string& message) = 0;
  std::size_t written() const { return 0; }
};
