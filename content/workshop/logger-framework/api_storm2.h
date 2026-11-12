#pragma once
// Change Storm 2 adds collapsing sinks. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace logx {

// A collapsing sink does not repeat itself. Lines reach it exactly as for an ordinary sink (same minimum, same
// thresholds), but a line identical to the one it received just before is held back and counted.
// When a different line arrives, or flush() is called, and at least one line was held back, the sink first
// receives the summary line
//     (last message repeated N times)
// (N is the number held back) and then, for a different line, that line. A held-back line is never written.
// "Just before" means the previous line that reached THIS sink: lines another sink receives, or that this sink's
// minimum filters out, do not break a run. Ordinary sinks are not affected and still get every line.
class CollapsingLogger : public CategoryLogger {
 public:
  // Same refusal rule as addSink().
  virtual bool addCollapsingSink(std::unique_ptr<Sink> sink, Level minimum) = 0;
  // Writes each collapsing sink's pending summary (if any) and ends its run, so the next line starts a new run
  // and is written even if it equals the previous one.
  virtual void flush() = 0;
};

std::unique_ptr<CollapsingLogger> makeCollapsingLogger();

}  // namespace logx
