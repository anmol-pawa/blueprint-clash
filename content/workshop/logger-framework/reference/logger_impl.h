#pragma once
#include <memory>
#include <string>
#include <utility>

#include "api.h"
#include "level_order.h"
#include "sink_list.h"

// The public face. log() applies the logger's level first, then reads the clock once, builds one Record and
// offers it to the sinks. Everything about individual sinks lives in SinkList.
class LoggerImpl : public logx::Logger {
 public:
  explicit LoggerImpl(std::unique_ptr<logx::Clock> clock) : clock_(std::move(clock)) {}

  void log(logx::Level level, const std::string& message) override {
    if (!atLeast(level, level_)) return;
    ++accepted_;
    logx::Record record;
    record.level = level;
    record.time = clock_->now();
    record.message = message;
    sinks_.offer(record);
  }

  void setLevel(logx::Level level) override { level_ = level; }
  logx::Level level() const override { return level_; }
  int addSink(std::unique_ptr<logx::Sink> sink, logx::Level threshold) override { return sinks_.add(std::move(sink), threshold); }
  bool removeSink(int id) override { return sinks_.remove(id); }
  int sinkCount() const override { return sinks_.size(); }
  void flush() override { sinks_.flush(); }
  int acceptedCount() const override { return accepted_; }

 private:
  std::unique_ptr<logx::Clock> clock_;
  logx::Level level_ = logx::Level::Info;
  SinkList sinks_;
  int accepted_ = 0;
};
