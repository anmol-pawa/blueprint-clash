#pragma once
#include <string>

struct LineItem {
  std::string name;
  long long unitCents;
  int quantity;
};

// Where finished invoice text goes (a file, a database, a test double).
class InvoiceSink {
 public:
  virtual ~InvoiceSink() = default;
  virtual void store(const std::string& text) = 0;
};
