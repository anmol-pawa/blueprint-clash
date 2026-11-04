#pragma once
#include <string>
#include "api.h"

// TODO: make IdGenerator a Meyers singleton (private constructor, deleted copy and move,
// instance() returning a reference), and give OrderService an IdSource& instead of a global.
class IdGenerator : public IdSource {
 public:
  static IdGenerator& instance() {
    static IdGenerator generator;
    return generator;
  }
  long next() override { return 0; }

 private:
  IdGenerator() = default;
};

class OrderService {
 public:
  std::string place(const std::string& item) { return item; }
};
