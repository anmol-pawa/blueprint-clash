#pragma once
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"
#include "format.h"
#include "handlers.h"
#include "level_policy.h"

// The public face: ask the policy whether to log, format once, hand the line to every sink's chain in order.
class LoggerImpl : public logx::CollapsingLogger {
 public:
  bool addSink(std::unique_ptr<logx::Sink> sink, logx::Level minimum) override { return attach(std::move(sink), minimum, false); }
  bool addCollapsingSink(std::unique_ptr<logx::Sink> sink, logx::Level minimum) override { return attach(std::move(sink), minimum, true); }
  int sinkCount() const override { return static_cast<int>(chains_.size()); }

  void setLevel(logx::Level threshold) override { policy_.setGlobal(threshold); }
  logx::Level level() const override { return policy_.global(); }
  bool setCategoryLevel(const std::string& category, logx::Level threshold) override {
    if (category.empty()) return false;
    policy_.set(category, threshold);
    return true;
  }
  bool clearCategoryLevel(const std::string& category) override { return policy_.clear(category); }

  void log(logx::Level level, const std::string& category, const std::string& message) override {
    if (!policy_.allows(level, category)) return;
    const std::string line = formatter_.format(level, category, message);
    for (const auto& chain : chains_) chain->handle(level, line);
  }

  void flush() override {
    for (const auto& chain : chains_) chain->flush();
  }

 private:
  bool attach(std::unique_ptr<logx::Sink> sink, logx::Level minimum, bool collapse) {
    if (sink == nullptr) return false;
    std::unique_ptr<Handler> chain = std::make_unique<SinkWriter>(std::move(sink));
    if (collapse) chain = std::make_unique<RepeatCollapser>(std::move(chain));
    chains_.push_back(std::make_unique<MinLevelFilter>(minimum, std::move(chain)));
    return true;
  }

  LineFormatter formatter_;
  LevelPolicy policy_;
  std::vector<std::unique_ptr<Handler>> chains_;
};
