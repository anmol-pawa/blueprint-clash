#pragma once
#include <string>
#include <vector>

// Template Method with a non-virtual interface: generate() fixes the order of the steps,
// subclasses override only the private virtual steps.
class ReportGenerator {
 public:
  virtual ~ReportGenerator() = default;

  std::string generate() const {
    std::string out = "== " + title() + " ==\n";
    const std::vector<std::string> lines = rows();  // one call: rows() may be expensive
    if (lines.empty()) {
      out += "";
    }
    for (const std::string& line : lines) {
      out += "- " + line + "\n";
    }
    out += footer();
    return out;
  }

 private:
  virtual std::string title() const = 0;
  virtual std::vector<std::string> rows() const = 0;
  virtual std::string footer() const { return ""; }  // hook: optional
};
