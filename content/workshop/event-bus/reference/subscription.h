#pragma once
#include <string>
#include <utility>

#include "api_storm2.h"
#include "topic_pattern.h"

// One registered interest: who to call, for which topics, and in which order relative to others.
// Shared between the registry and any dispatch in progress, so a handler that unsubscribes itself keeps running safely.
class Subscription {
 public:
  Subscription(int id, TopicPattern pattern, bus::Handler handler, bus::Options options)
      : id_(id), pattern_(std::move(pattern)), handler_(std::move(handler)), options_(options) {}

  int id() const { return id_; }
  int priority() const { return options_.priority; }
  bool once() const { return options_.once; }
  bool active() const { return active_; }
  void deactivate() { active_ = false; }
  bool matches(const std::string& topic) const { return pattern_.matches(topic); }
  void deliver(const bus::Event& event) const { handler_(event); }

 private:
  int id_;
  TopicPattern pattern_;
  bus::Handler handler_;
  bus::Options options_;
  bool active_ = true;
};
