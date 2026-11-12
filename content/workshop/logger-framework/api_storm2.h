#pragma once
// Change Storm 2 collapses repeated records. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace logx {

// Adds `sink` to `logger` behind a repeat filter, with the same threshold rules as Logger::addSink().
// Returns the sink id, or -1 (and adds nothing) if the sink is null or windowMs < 0.
//
// The filter looks at the records the sink would receive (those at or above `threshold`). A record is a
// repeat of the current run when it has the same level and the same message as the record that started the
// run, and its time is at most `windowMs` after the time of the record that started the run (inclusive).
// - The first record of a run is passed to the sink as it is.
// - Repeats are not passed on; they are counted.
// - When the run ends (a record that is not a repeat arrives, or flush() is called) and at least one repeat
//   was held back, the sink first receives one summary record: the same level, the message followed by
//   " (x" + count + ")", and the time of the last repeat. Then, if the run ended because a record arrived,
//   that record is passed on and starts the next run.
// - flush() also forgets the run, so the next record starts a new one, and then flushes the wrapped sink.
// Every dedup sink keeps its own run.
int addDedupSink(Logger& logger, std::unique_ptr<Sink> sink, Level threshold, long long windowMs);

}  // namespace logx
