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

// A destination for finished log lines: a console, a file, a network socket. The tests hand in sinks that
// record what they receive. A sink only ever sees a complete line, never a level or a category.
class Sink {
 public:
  virtual ~Sink() = default;
  virtual void write(const std::string& line) = 0;
};

class Logger {
 public:
  virtual ~Logger() = default;

  // Attach a sink. It receives every later line whose level is at least `minimum` (and that passes the
  // logger's own threshold, see setLevel). Sinks are written to in the order they were added.
  // A null sink is refused: the call returns false and changes nothing.
  virtual bool addSink(std::unique_ptr<Sink> sink, Level minimum) = 0;
  virtual int sinkCount() const = 0;

  // The logger-wide threshold: a record below it is dropped for every sink. It starts at Debug (nothing dropped).
  virtual void setLevel(Level threshold) = 0;
  virtual Level level() const = 0;

  // Log one record. The line each sink receives is exactly:
  //     [LEVEL] category: message        (LEVEL is DEBUG, INFO, WARN or ERROR)
  // and, when the category is empty, just:
  //     [LEVEL] message
  virtual void log(Level level, const std::string& category, const std::string& message) = 0;
};

std::unique_ptr<Logger> makeLogger();

}  // namespace logx
