#pragma once
#include <cstddef>
#include <string>
#include <vector>

#include "topic_matcher.h"

// Dot-separated topics. "*" matches one segment, "#" (last only) matches zero or more.
class SegmentMatcher : public TopicMatcher {
 public:
  bool validPattern(const std::string& pattern) const override {
    std::vector<std::string> parts;
    if (!split(pattern, parts)) return false;
    for (std::size_t i = 0; i + 1 < parts.size(); ++i) {
      if (parts[i] == kRest) return false;
    }
    return true;
  }

  bool validTopic(const std::string& topic) const override {
    std::vector<std::string> parts;
    if (!split(topic, parts)) return false;
    for (const auto& part : parts) {
      if (part == kOne || part == kRest) return false;
    }
    return true;
  }

  bool matches(const std::string& pattern, const std::string& topic) const override {
    std::vector<std::string> patternParts;
    std::vector<std::string> topicParts;
    if (!split(pattern, patternParts) || !split(topic, topicParts)) return false;
    return matchFrom(patternParts, 0, topicParts, 0);
  }

 private:
  static constexpr const char* kOne = "*";
  static constexpr const char* kRest = "#";

  // Splits on '.', returns false if any segment is empty.
  static bool split(const std::string& text, std::vector<std::string>& parts) {
    parts.clear();
    std::size_t start = 0;
    while (true) {
      const std::size_t dot = text.find('.', start);
      const std::string part = text.substr(start, dot == std::string::npos ? std::string::npos : dot - start);
      if (part.empty()) return false;
      parts.push_back(part);
      if (dot == std::string::npos) return true;
      start = dot + 1;
    }
  }

  static bool matchFrom(const std::vector<std::string>& pattern, std::size_t p, const std::vector<std::string>& topic, std::size_t t) {
    if (p == pattern.size()) return t == topic.size();
    if (pattern[p] == kRest) return true;  // validPattern() guarantees it is the last segment
    if (t == topic.size()) return false;
    if (pattern[p] != kOne && pattern[p] != topic[t]) return false;
    return matchFrom(pattern, p + 1, topic, t + 1);
  }
};
