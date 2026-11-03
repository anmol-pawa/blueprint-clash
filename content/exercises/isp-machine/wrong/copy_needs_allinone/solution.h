#pragma once
#include <string>
#include "api.h"

namespace detail {
inline int pagesFor(const std::string& text) { return static_cast<int>((text.size() + 9) / 10); }
}  // namespace detail

class BasicPrinter : public Printer {
 public:
  int print(const std::string& text) override { return detail::pagesFor(text); }
};

class AllInOne : public Printer, public Scanner {
 public:
  int print(const std::string& text) override { return detail::pagesFor(text); }
  std::string scan() override { return "scan#" + std::to_string(++scans_); }

 private:
  int scans_ = 0;
};

// Too wide: only an AllInOne can be copied from.
inline int copyDocument(AllInOne& machine, AllInOne& same) { return same.print(machine.scan()); }
