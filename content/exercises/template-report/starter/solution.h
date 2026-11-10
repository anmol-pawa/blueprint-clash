#pragma once
#include <string>
#include <vector>

// TODO: generate() is public, non-virtual and const. It calls the private virtual steps in order:
// heading, rows (once), footer hook.
class ReportGenerator {
 public:
  virtual ~ReportGenerator() = default;

  std::string generate() const { return ""; }

 private:
  virtual std::string title() const = 0;
  virtual std::vector<std::string> rows() const = 0;
  virtual std::string footer() const { return ""; }
};
