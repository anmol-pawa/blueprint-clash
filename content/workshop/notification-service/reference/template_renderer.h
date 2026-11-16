#pragma once
#include <cstddef>
#include <map>
#include <string>

// Fills "{name}" placeholders from a parameter map. Owns the grammar: a placeholder is '{', one or more letters, digits
// or underscores, '}'. Everything else is copied as it is, and inserted values are never scanned again.
class TemplateRenderer {
 public:
  // Writes the result to `out`. Returns false (leaving `out` unspecified) when a placeholder has no parameter.
  bool render(const std::string& text, const std::map<std::string, std::string>& params, std::string& out) const {
    out.clear();
    std::size_t at = 0;
    while (at < text.size()) {
      const std::size_t close = placeholderEnd(text, at);
      if (close == std::string::npos) {
        out += text[at++];
        continue;
      }
      const auto found = params.find(text.substr(at + 1, close - at - 1));
      if (found == params.end()) return false;
      out += found->second;
      at = close + 1;
    }
    return true;
  }

 private:
  // Index of the '}' closing a placeholder that starts at `open`, or npos if there is no placeholder there.
  static std::size_t placeholderEnd(const std::string& text, std::size_t open) {
    if (text[open] != '{') return std::string::npos;
    std::size_t at = open + 1;
    while (at < text.size() && isNameChar(text[at])) ++at;
    if (at == open + 1 || at == text.size() || text[at] != '}') return std::string::npos;
    return at;
  }

  static bool isNameChar(char c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_';
  }
};
