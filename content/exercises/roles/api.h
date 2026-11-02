#pragma once
#include <string>

class Readable {
 public:
  virtual ~Readable() = default;
  virtual std::string read() const = 0;
};

class Writable {
 public:
  virtual ~Writable() = default;
  virtual void write(const std::string& text) = 0;
};
