// The newest sink is written first.
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"

namespace {
using namespace logx;

// One class does everything: thresholds, formatting, sinks and de-duplication.
class Naive : public CollapsingLogger {
 public:
  bool addSink(std::unique_ptr<Sink> sink, Level minimum) override { return add(std::move(sink), minimum, false); }
  bool addCollapsingSink(std::unique_ptr<Sink> sink, Level minimum) override { return add(std::move(sink), minimum, true); }
  int sinkCount() const override { return static_cast<int>(slots_.size()); }
  void setLevel(Level threshold) override { global_ = threshold; }
  Level level() const override { return global_; }

  bool setCategoryLevel(const std::string& category, Level threshold) override {
    if (category.empty()) return false;
    cats_[category] = threshold;
    return true;
  }
  bool clearCategoryLevel(const std::string& category) override { return cats_.erase(category) > 0; }

  void log(Level level, const std::string& category, const std::string& message) override {
    if (static_cast<int>(level) < static_cast<int>(thresholdFor(category))) return; // GLOBAL_CHECK
    static const char* const names[] = {"DEBUG", "INFO", "WARN", "ERROR"};
    std::string line = std::string("[") + names[static_cast<int>(level)] + "] ";
    if (!category.empty()) line += category + ": ";
    line += message;
    // SINK_LOOP_BEGIN
    for (auto it = slots_.rbegin(); it != slots_.rend(); ++it) {
      auto& s = *it;
      if (static_cast<int>(level) < static_cast<int>(s.minimum)) continue; // SINK_MIN
      if (s.collapse) {
        if (s.running && s.last == line) { ++s.held; continue; }
        if (s.held > 0) s.sink->write("(last message repeated " + std::to_string(s.held) + " times)");
        s.held = 0;
        s.running = true;
        s.last = line;
      }
      s.sink->write(line);
    }
    // SINK_LOOP_END
  }

  void flush() override {
    for (auto& s : slots_) {
      if (s.held > 0) s.sink->write("(last message repeated " + std::to_string(s.held) + " times)"); // FLUSH_WRITE
      s.held = 0;
      s.running = false;
    }
  }

 private:
  struct Slot {
    std::unique_ptr<Sink> sink;
    Level minimum;
    bool collapse;
    bool running = false;
    std::string last;
    int held = 0;
  };

  bool add(std::unique_ptr<Sink> sink, Level minimum, bool collapse) {
    if (sink == nullptr) return false; // NULL_CHECK
    Slot s;
    s.sink = std::move(sink);
    s.minimum = minimum;
    s.collapse = collapse;
    slots_.push_back(std::move(s)); // ADD_SLOT
    return true;
  }

  Level thresholdFor(const std::string& category) const {
    std::string path = category;
    while (!path.empty()) {
      auto it = cats_.find(path);
      if (it != cats_.end()) return it->second;
      std::size_t dot = path.rfind('.');
      path = dot == std::string::npos ? std::string() : path.substr(0, dot);
    }
    return global_;
  }

  Level global_ = Level::Debug;
  std::map<std::string, Level> cats_;
  std::vector<Slot> slots_;
};
}  // namespace

std::unique_ptr<logx::Logger> logx::makeLogger() { return std::make_unique<Naive>(); }
std::unique_ptr<logx::CategoryLogger> logx::makeCategoryLogger() { return std::make_unique<Naive>(); }
std::unique_ptr<logx::CollapsingLogger> logx::makeCollapsingLogger() { return std::make_unique<Naive>(); }
