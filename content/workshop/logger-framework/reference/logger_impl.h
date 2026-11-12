#pragma once
#include <memory>
#include <string>
#include <utility>

#include "api_storm1.h"
#include "level_gate.h"
#include "line_format.h"
#include "sink_set.h"

// The facade: ask the gate, read the clock once, format once, hand the line to the sinks. Each step is
// owned by a small class; this one only sequences them.
class LoggerImpl : public logx::ConfigurableLogger {
 public:
  explicit LoggerImpl(std::unique_ptr<logx::Clock> clock) : clock_(std::move(clock)) {}

  void log(logx::Level level, const std::string& category, const std::string& message) override {
    if (!gate_.accepts(level, category)) return;
    ++accepted_;
    const std::string line = format_.format(clock_->now(), level, category, message);
    sinks_.deliver(level, line);
  }

  void setLevel(logx::Level level) override { gate_.setGlobal(level); }
  void addSink(std::unique_ptr<logx::Sink> sink, logx::Level minLevel) override { sinks_.add(std::move(sink), minLevel); }
  int accepted() const override { return accepted_; }

  bool setCategoryLevel(const std::string& category, logx::Level level) override { return gate_.setCategory(category, level); }
  void clearCategoryLevel(const std::string& category) override { gate_.clearCategory(category); }

 private:
  std::unique_ptr<logx::Clock> clock_;
  LevelGate gate_;
  LineFormat format_;
  SinkSet sinks_;
  int accepted_ = 0;
};
