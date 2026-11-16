#pragma once
#include <string>

#include "api_storm2.h"

// How topics are written and compared. The bus asks this object and never looks inside a topic itself, which is
// what lets "exact" and "dotted with wildcards" be two classes instead of two code paths.
class TopicMatcher {
 public:
  virtual ~TopicMatcher() = default;

  // Is `pattern` something a subscriber may register?
  virtual bool validPattern(const std::string& pattern) const = 0;

  // Is `topic` something an event may be published to?
  virtual bool validTopic(const std::string& topic) const = 0;

  // Does a subscription made with `pattern` want an event published to `topic`?
  virtual bool matches(const std::string& pattern, const std::string& topic) const = 0;
};

// A topic is any non-empty string and matches only itself.
class ExactMatcher : public TopicMatcher {
 public:
  bool validPattern(const std::string& pattern) const override { return !pattern.empty(); }
  bool validTopic(const std::string& topic) const override { return !topic.empty(); }
  bool matches(const std::string& pattern, const std::string& topic) const override { return pattern == topic; }
};
