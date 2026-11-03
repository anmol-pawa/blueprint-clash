#pragma once
#include <string>

// Narrow roles. A client depends only on the role it uses.
class Printer {
 public:
  virtual ~Printer() = default;
  // Prints the text and returns the number of pages used.
  virtual int print(const std::string& text) = 0;
};

class Scanner {
 public:
  virtual ~Scanner() = default;
  // Returns the text of the next scanned document.
  virtual std::string scan() = 0;
};
