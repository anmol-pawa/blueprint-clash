#pragma once
#include <memory>
#include <string>
#include <utility>

#include "api.h"

// One link in a sink's delivery chain. A chain is built once per sink: the logger hands every finished line to
// the head and each link decides what to do before passing it on. Behaviour is added by adding a link, not by
// adding a flag to the logger.
class Handler {
 public:
  virtual ~Handler() = default;
  virtual void handle(logx::Level level, const std::string& line) = 0;
  // Pushes out anything a link is holding back (a pending summary) and forgets its history.
  virtual void flush() = 0;
};

// The end of every chain: hands the line to the real sink.
class SinkWriter : public Handler {
 public:
  explicit SinkWriter(std::unique_ptr<logx::Sink> sink) : sink_(std::move(sink)) {}
  void handle(logx::Level, const std::string& line) override { sink_->write(line); }
  void flush() override {}

 private:
  std::unique_ptr<logx::Sink> sink_;
};

// Drops lines below this sink's own minimum.
class MinLevelFilter : public Handler {
 public:
  MinLevelFilter(logx::Level minimum, std::unique_ptr<Handler> next) : minimum_(minimum), next_(std::move(next)) {}
  void handle(logx::Level level, const std::string& line) override {
    if (static_cast<int>(level) >= static_cast<int>(minimum_)) next_->handle(level, line);
  }
  void flush() override { next_->flush(); }

 private:
  logx::Level minimum_;
  std::unique_ptr<Handler> next_;
};

// Holds back a line identical to the previous one and reports the count when the run ends.
// Placed after the level filter, so only lines that reach the sink can start or break a run.
class RepeatCollapser : public Handler {
 public:
  explicit RepeatCollapser(std::unique_ptr<Handler> next) : next_(std::move(next)) {}

  void handle(logx::Level level, const std::string& line) override {
    if (running_ && line == last_) {
      ++held_;
      return;
    }
    endRun();
    running_ = true;
    last_ = line;
    lastLevel_ = level;
    next_->handle(level, line);
  }

  void flush() override {
    endRun();
    running_ = false;
    next_->flush();
  }

 private:
  void endRun() {
    if (held_ > 0) next_->handle(lastLevel_, "(last message repeated " + std::to_string(held_) + " times)");
    held_ = 0;
  }

  std::unique_ptr<Handler> next_;
  bool running_ = false;
  std::string last_;
  logx::Level lastLevel_ = logx::Level::Debug;
  int held_ = 0;
};
