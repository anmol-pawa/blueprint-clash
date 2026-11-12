#pragma once
// Public API for the Logger framework problem. The hidden tests only use what is declared here.
// You implement logx::makeLogger() and logx::levelName() (in any of your .cpp files); everything behind them is your design.
#include <memory>
#include <string>

namespace logx {

// Severity, lowest first: Debug < Info < Warn < Error.
enum class Level {
  Debug,
  Info,
  Warn,
  Error
};

// "DEBUG", "INFO", "WARN" or "ERROR".
const char* levelName(Level level);

// One accepted log call, as the sinks see it.
struct Record {
  Level level = Level::Info;
  long long time = 0;  // read from the Clock when the logger accepted the call
  std::string message;
};

// Where the time comes from. The logger never reads a real clock: tests hand it a scripted one.
class Clock {
 public:
  virtual ~Clock() = default;
  virtual long long now() = 0;
};

// Somewhere a record can go: a console, a file, a network socket. The tests provide their own sinks.
class Sink {
 public:
  virtual ~Sink() = default;
  virtual void write(const Record& record) = 0;
  // Push out anything the sink is holding back. Most sinks hold nothing.
  virtual void flush() {}
};

class Logger {
 public:
  virtual ~Logger() = default;

  // Logs a message at `level`. Dropped silently if `level` is below the logger's level (see setLevel).
  virtual void log(Level level, const std::string& message) = 0;
  void debug(const std::string& message) { log(Level::Debug, message); }
  void info(const std::string& message) { log(Level::Info, message); }
  void warn(const std::string& message) { log(Level::Warn, message); }
  void error(const std::string& message) { log(Level::Error, message); }

  // The logger's own level: calls below it are dropped before anything else happens. Starts at Info.
  virtual void setLevel(Level level) = 0;
  virtual Level level() const = 0;

  // Takes ownership of the sink. The sink receives every accepted record whose level is >= `threshold`.
  // Returns an id (1, 2, 3, ... in the order added, never reused), or -1 if the sink is null.
  virtual int addSink(std::unique_ptr<Sink> sink, Level threshold) = 0;
  // Removes and destroys a sink. Returns false if the id is unknown or was already removed.
  virtual bool removeSink(int id) = 0;
  virtual int sinkCount() const = 0;

  // Calls flush() on every sink, in the order they were added.
  virtual void flush() = 0;
  // Number of calls to log() that were accepted (not dropped by the logger's level).
  virtual int acceptedCount() const = 0;
};

// A logger that starts at Level::Info with no sinks. Returns nullptr if the clock is null.
//
// For every accepted call the logger reads the clock exactly once, builds one Record, and offers it to the sinks
// in the order they were added; a sink receives it if record.level >= that sink's threshold.
// A call that is dropped does not read the clock, is not counted and reaches no sink.
std::unique_ptr<Logger> makeLogger(std::unique_ptr<Clock> clock);

}  // namespace logx
