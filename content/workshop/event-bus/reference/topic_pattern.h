#pragma once
#include <algorithm>
#include <cstddef>
#include <optional>
#include <string>
#include <utility>
#include <vector>

// A dotted topic filter such as "orders.*.created" or "audit.#". It knows the syntax and what matches;
// it knows nothing about subscribers or delivery.
class TopicPattern {
 public:
  // Empty when the text is not a valid pattern.
  static std::optional<TopicPattern> parse(const std::string& text) {
    auto parts = split(text);
    if (!parts) return std::nullopt;
    for (std::size_t i = 0; i + 1 < parts->size(); ++i) {
      if ((*parts)[i] == kRest) return std::nullopt;
    }
    return TopicPattern(std::move(*parts));
  }

  // True when `topic` is a plain topic (no wildcards) that this pattern matches as a whole.
  bool matches(const std::string& topic) const {
    const auto words = split(topic);
    if (!words) return false;
    if (std::any_of(words->begin(), words->end(), isWildcard)) return false;
    for (std::size_t i = 0; i < segments_.size(); ++i) {
      if (segments_[i] == kRest) return words->size() > i;
      if (i >= words->size()) return false;
      if (segments_[i] != kOne && segments_[i] != (*words)[i]) return false;
    }
    return words->size() == segments_.size();
  }

 private:
  static constexpr const char* kOne = "*";
  static constexpr const char* kRest = "#";

  explicit TopicPattern(std::vector<std::string> segments) : segments_(std::move(segments)) {}

  static bool isWildcard(const std::string& segment) { return segment == kOne || segment == kRest; }

  static bool validSegment(const std::string& segment) {
    if (isWildcard(segment)) return true;
    return !segment.empty() && segment.find_first_of("*#") == std::string::npos;
  }

  // Words between dots; empty when the text is empty or any segment is malformed.
  static std::optional<std::vector<std::string>> split(const std::string& text) {
    if (text.empty()) return std::nullopt;
    std::vector<std::string> parts;
    std::size_t start = 0;
    while (true) {
      const std::size_t dot = text.find('.', start);
      parts.push_back(text.substr(start, dot == std::string::npos ? std::string::npos : dot - start));
      if (dot == std::string::npos) break;
      start = dot + 1;
    }
    for (const auto& part : parts) {
      if (!validSegment(part)) return std::nullopt;
    }
    return parts;
  }

  std::vector<std::string> segments_;
};
