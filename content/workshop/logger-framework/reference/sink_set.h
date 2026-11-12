#pragma once
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "levels.h"

// The destinations, in the order they were added, each with its own minimum level.
class SinkSet {
 public:
  void add(std::unique_ptr<logx::Sink> sink, logx::Level minimum) {
    if (sink == nullptr) return;
    entries_.push_back(Entry{std::move(sink), minimum});
  }

  void deliver(logx::Level level, const std::string& line) {
    for (auto& entry : entries_) {
      if (levels::atLeast(level, entry.minimum)) entry.sink->write(line);
    }
  }

 private:
  struct Entry {
    std::unique_ptr<logx::Sink> sink;
    logx::Level minimum;
  };
  std::vector<Entry> entries_;
};
