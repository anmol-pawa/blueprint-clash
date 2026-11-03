#pragma once
#include <string>
#include "api.h"

namespace detail {
inline int pagesFor(const std::string& text) { return static_cast<int>((text.size() + 9) / 10); }
}  // namespace detail

// Only a printer: no scan() stub to get wrong.
class BasicPrinter : public Printer {
 public:
  int print(const std::string& text) override { return detail::pagesFor(text); }
};

// Two roles, two bases.
class AllInOne : public Printer, public Scanner {
 public:
  int print(const std::string& text) override { return detail::pagesFor(text); }
  std::string scan() override { return "scan#" + std::to_string(++scans_); }

 private:
  int scans_ = 0;
};

// Depends on the narrowest roles it uses.
inline int copyDocument(Scanner& from, Printer& to) { return to.print(from.scan()); }
