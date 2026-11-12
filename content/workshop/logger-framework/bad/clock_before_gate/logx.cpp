// // The clock is read before the level check, so dropped records still consume a timestamp.
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api_storm1.h"

namespace {
using namespace logx;

// One class does everything: gate, format, clock, sinks, counting.
class Naive : public ConfigurableLogger {
 public:
  explicit Naive(std::unique_ptr<Clock> clock) : clock_(std::move(clock)) {}

  void log(Level level, const std::string& category, const std::string& message) override {
    const long long early = clock_->now();
    if (!passes(level, category)) return;
    ++accepted_;
    const long long time = early;
    const std::string line = "[" + std::to_string(time) + "] " + name(level) + " " + (category.empty() ? "-" : escape(category)) + ": " + escape(message);
    for (auto& s : sinks_) {
      if (static_cast<int>(level) >= static_cast<int>(s.min)) s.sink->write(line);
    }
  }

  void setLevel(Level level) override {
    global_ = level;
  }
  void addSink(std::unique_ptr<Sink> sink, Level minLevel) override {
    if (sink != nullptr) sinks_.push_back(Entry{std::move(sink), minLevel});
  }
  int accepted() const override { return accepted_; }

  bool setCategoryLevel(const std::string& category, Level level) override {
    if (category.empty()) return false;
    rules_[category] = level;
    return true;
  }
  void clearCategoryLevel(const std::string& category) override { rules_.erase(category); }

 private:
  struct Entry {
    std::unique_ptr<Sink> sink;
    Level min;
  };

  static const char* name(Level level) {
    static const char* const kNames[] = {"DEBUG", "INFO", "WARN", "ERROR"};
    return kNames[static_cast<int>(level)];
  }

  static std::string escape(const std::string& text) {
    std::string out;
    for (const char c : text) {
      if (c == '\n') out += "\\n";
      else if (c == '\r') out += "\\r";
      else out += c;
    }
    return out;
  }

  bool passes(Level level, const std::string& category) const {
    Level min = global_;
    std::string name = category;
    while (!name.empty()) {
      const auto it = rules_.find(name);
      if (it != rules_.end()) { min = it->second; break; }
      const auto dot = name.rfind('.');
      if (dot == std::string::npos) break;
      name.resize(dot);
    }
    return static_cast<int>(level) >= static_cast<int>(min);
  }

  std::unique_ptr<Clock> clock_;
  Level global_ = Level::Debug;
  std::map<std::string, Level> rules_;
  std::vector<Entry> sinks_;
  int accepted_ = 0;
};
}  // namespace

std::unique_ptr<logx::Logger> logx::makeLogger(std::unique_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<Naive>(std::move(clock));
}

std::unique_ptr<logx::ConfigurableLogger> logx::makeConfigurableLogger(std::unique_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<Naive>(std::move(clock));
}
