#pragma once
#include <memory>
#include <utility>
#include <vector>

#include "api.h"
#include "level_order.h"

// Owns the sinks with their thresholds and ids, and offers a record to the ones that want it.
// It knows nothing about the logger's own level, the clock or what a sink does with a record.
class SinkList {
 public:
  static constexpr int kNoSink = -1;

  int add(std::unique_ptr<logx::Sink> sink, logx::Level threshold) {
    if (sink == nullptr) return kNoSink;
    entries_.push_back(Entry{nextId_, threshold, std::move(sink)});
    return nextId_++;
  }

  bool remove(int id) {
    for (auto it = entries_.begin(); it != entries_.end(); ++it) {
      if (it->id == id) {
        entries_.erase(it);
        return true;
      }
    }
    return false;
  }

  int size() const { return static_cast<int>(entries_.size()); }

  void offer(const logx::Record& record) const {
    for (const auto& entry : entries_) {
      if (atLeast(record.level, entry.threshold)) entry.sink->write(record);
    }
  }

  void flush() const {
    for (const auto& entry : entries_) entry.sink->flush();
  }

 private:
  struct Entry {
    int id;
    logx::Level threshold;
    std::unique_ptr<logx::Sink> sink;
  };

  std::vector<Entry> entries_;
  int nextId_ = 1;
};
