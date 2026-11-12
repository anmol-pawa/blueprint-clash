#pragma once
#include <memory>
#include <string>
#include <utility>

#include "api_storm2.h"

// Wraps a sink and collapses a run of identical records into the first one plus a summary line.
// The run is state of this one sink, so two dedup sinks never interfere and the logger knows nothing about it.
class DedupSink : public logx::Sink {
 public:
  DedupSink(std::unique_ptr<logx::Sink> inner, long long windowMs) : inner_(std::move(inner)), windowMs_(windowMs) {}

  void write(const logx::Record& record) override {
    if (continuesRun(record)) {
      ++held_;
      lastRepeatTime_ = record.time;
      return;
    }
    emitSummary();
    first_ = record;
    inRun_ = true;
    inner_->write(record);
  }

  void flush() override {
    emitSummary();
    inRun_ = false;
    inner_->flush();
  }

 private:
  bool continuesRun(const logx::Record& record) const {
    return inRun_ && record.level == first_.level && record.message == first_.message && record.time - first_.time <= windowMs_;
  }

  void emitSummary() {
    if (held_ == 0) return;
    logx::Record summary;
    summary.level = first_.level;
    summary.time = lastRepeatTime_;
    summary.message = first_.message + " (x" + std::to_string(held_) + ")";
    held_ = 0;
    inner_->write(summary);
  }

  std::unique_ptr<logx::Sink> inner_;
  long long windowMs_;
  bool inRun_ = false;
  logx::Record first_;
  int held_ = 0;
  long long lastRepeatTime_ = 0;
};
