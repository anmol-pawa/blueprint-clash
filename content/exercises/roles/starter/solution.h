#pragma once
#include <string>
#include <utility>
#include "api.h"

// TODO: give each class only the roles it really has.
class Notebook {
 public:
  std::string read() const { return text_; }
  void write(const std::string& text) { text_ = text; }

 private:
  std::string text_;
};

class Sensor {
 public:
  explicit Sensor(std::string reading) : reading_(std::move(reading)) {}
  std::string read() const { return reading_; }

 private:
  std::string reading_;
};

void archive(const Notebook& from, Notebook& to) { to.write(from.read()); }
