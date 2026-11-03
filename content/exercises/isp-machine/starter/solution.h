#pragma once
#include <string>
#include "api.h"

// TODO: split the roles. BasicPrinter must not be a Scanner; copyDocument takes the narrow roles.
class BasicPrinter : public Printer {
 public:
  int print(const std::string& text) override {
    (void)text;
    return 0;
  }
};

class AllInOne : public Printer {
 public:
  int print(const std::string& text) override {
    (void)text;
    return 0;
  }
};

inline int copyDocument(Printer& to, Printer& from) {
  (void)to;
  (void)from;
  return 0;
}
