#pragma once

// Anything that hands out unique, increasing order numbers.
class IdSource {
 public:
  virtual ~IdSource() = default;
  virtual long next() = 0;
};
