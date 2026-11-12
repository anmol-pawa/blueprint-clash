#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "api.h"
#include "api_storm1.h"
#include "api_storm2.h"

// Levels are an ordered scale; "at or above" is the only comparison the library needs.
inline bool atLeast(logx::Level level, logx::Level floor) { return static_cast<int>(level) >= static_cast<int>(floor); }



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



// A parsed output pattern. Parsing happens once, when the sink is added, so a bad pattern is refused up front
// and writing a record is a walk over ready-made parts. A message is inserted as text and never re-scanned.
class Pattern {
 public:
  static std::optional<Pattern> parse(const std::string& text) {
    Pattern pattern;
    std::string literal;
    for (std::size_t i = 0; i < text.size(); ++i) {
      if (text[i] != '%') {
        literal += text[i];
        continue;
      }
      if (i + 1 == text.size()) {
        literal += '%';
        break;
      }
      const char code = text[++i];
      if (code == '%') {
        literal += '%';
        continue;
      }
      Field field;
      if (code == 'l') {
        field = [](const logx::Record& r) { return std::string(logx::levelName(r.level)); };
      } else if (code == 't') {
        field = [](const logx::Record& r) { return std::to_string(r.time); };
      } else if (code == 'm') {
        field = [](const logx::Record& r) { return r.message; };
      } else {
        literal += '%';
        literal += code;
        continue;
      }
      pattern.flushLiteral(literal);
      pattern.parts_.push_back(Part{field, std::string()});
    }
    pattern.flushLiteral(literal);
    return pattern;
  }

  std::string render(const logx::Record& record) const {
    std::string line;
    for (const auto& part : parts_) line += part.field != nullptr ? part.field(record) : part.text;
    return line;
  }

 private:
  // A part is either fixed text or a field that reads one value from the record.
  using Field = std::string (*)(const logx::Record&);
  struct Part {
    Field field;
    std::string text;
  };

  void flushLiteral(std::string& literal) {
    if (literal.empty()) return;
    parts_.push_back(Part{nullptr, literal});
    literal.clear();
  }

  std::vector<Part> parts_;
};

// Adapts a text destination to the Record-based Sink seam, so the logger needs no idea that text exists.
class FormattingSink : public logx::Sink {
 public:
  FormattingSink(Pattern pattern, std::unique_ptr<logx::LineSink> target) : pattern_(std::move(pattern)), target_(std::move(target)) {}

  void write(const logx::Record& record) override { target_->writeLine(pattern_.render(record)); }
  void flush() override { target_->flush(); }

 private:
  Pattern pattern_;
  std::unique_ptr<logx::LineSink> target_;
};



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


namespace {
constexpr int kRefused = -1;
}  // namespace

const char* logx::levelName(Level level) {
  switch (level) {
    case Level::Debug: return "DEBUG";
    case Level::Info: return "INFO";
    case Level::Warn: return "WARN";
    case Level::Error: return "ERROR";
  }
  return "";
}

std::unique_ptr<logx::Logger> logx::makeLogger(std::unique_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<LoggerImpl>(std::move(clock));
}

int logx::addLineSink(Logger& logger, std::unique_ptr<LineSink> sink, Level threshold, const std::string& pattern) {
  if (sink == nullptr) return kRefused;
  std::optional<Pattern> parsed = Pattern::parse(pattern);
  if (!parsed) return kRefused;
  return logger.addSink(std::make_unique<FormattingSink>(std::move(*parsed), std::move(sink)), threshold);
}

int logx::addDedupSink(Logger& logger, std::unique_ptr<Sink> sink, Level threshold, long long windowMs) {
  if (sink == nullptr || windowMs < 0) return kRefused;
  return logger.addSink(std::make_unique<DedupSink>(std::move(sink), windowMs), threshold);
}
