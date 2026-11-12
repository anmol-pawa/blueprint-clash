#pragma once
// Change Storm 1 adds formatted text output. Everything from api.h still holds.
#include "api.h"

namespace logx {

// A sink that wants a line of text rather than a Record.
class LineSink {
 public:
  virtual ~LineSink() = default;
  virtual void writeLine(const std::string& line) = 0;
  virtual void flush() {}
};

// Adds a sink to `logger` that receives each record as text, built from `pattern`. Returns the sink id like
// Logger::addSink() does, or -1 (and adds nothing) if the sink is null or the pattern is invalid.
//
// In a pattern, %l is the level name (levelName), %t the record's time in decimal, %m the message, and %% a
// percent sign. Every other character is copied as it is. A '%' followed by anything else, or ending the
// pattern, makes it invalid. The text of a message is never interpreted: a message containing "%t" is
// written as those two characters. No newline is added. flush() on the logger reaches the line sink.
int addLineSink(Logger& logger, std::unique_ptr<LineSink> sink, Level threshold, const std::string& pattern);

}  // namespace logx
