#pragma once
// Public API for the Logger framework problem. The hidden tests only use what is declared here.
// You implement logx::makeLogger() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>

namespace logx {

enum class Level {
  Debug,  // least severe
  Info,
  Warn,
  Error  // most severe
};

// A source of timestamps. The logger never reads the system clock: tests hand it a scripted one.
class Clock {
 public:
  virtual ~Clock() = default;
  virtual long long now() = 0;
};

// A destination for finished log lines (a console, a file, a network forwarder, a test buffer).
// The line has no trailing newline.
class Sink {
 public:
  virtual ~Sink() = default;
  virtual void write(const std::string& line) = 0;
};

class Logger {
 public:
  virtual ~Logger() = default;

  // Offers one record to the logger. Records are formatted into a single line, see makeLogger().
  virtual void log(Level level, const std::string& category, const std::string& message) = 0;

  // The logger-wide minimum level. Records below it are dropped before anything else happens.
  // Starts at Level::Debug, so nothing is dropped until someone raises it.
  virtual void setLevel(Level level) = 0;

  // Adds a destination. The logger owns it. The sink receives only records at or above `minLevel`.
  // A null sink is ignored. A sink added later does not see earlier records.
  virtual void addSink(std::unique_ptr<Sink> sink, Level minLevel) = 0;

  // How many records passed the logger's level check so far (whether or not any sink wanted them).
  virtual int accepted() const = 0;
};

// Each accepted record becomes one line:   [<time>] <LEVEL> <category>: <message>
// LEVEL is DEBUG, INFO, WARN or ERROR. The time is clock->now(), read once per accepted record and
// never for a dropped one, and every sink receives the same line. An empty category is written as "-".
// A carriage return or line feed inside the category or the message is written as the two characters
// \r or \n, so one record is always one line. Sinks are called in the order they were added.
//
// Returns nullptr if the clock is null.
std::unique_ptr<Logger> makeLogger(std::unique_ptr<Clock> clock);

}  // namespace logx
