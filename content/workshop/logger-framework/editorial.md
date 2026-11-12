# Editorial: Logger Framework

## Requirements
Functional: application code calls a `Logger` with a level and a message. The logger drops calls below its own level, stamps each accepted call with the time from an injected `Clock`, and offers the resulting `Record` to its sinks. Each sink has its own threshold, sinks are called in the order added, and they can be removed by id and flushed. Hidden until asked: the default level (Info), that a dropped call neither reads the clock nor counts, that the clock is read exactly once per accepted record whatever the sinks, that ids are never reused, and null handling. Non-goals: thread safety, real console or file sinks, structured fields, log rotation.

**Change Storm 1, text output:** `addLineSink()` adds a sink that receives a line built from a pattern (`%l`, `%t`, `%m`, `%%`), with invalid patterns refused.

**Change Storm 2, collapsing repeats:** `addDedupSink()` wraps a sink so that a run of identical records becomes the first record plus a `(xN)` summary, flushed on `flush()`.

## Reference design
- `Logger` (`LoggerImpl`) applies the level, reads the clock once, counts, builds one `Record` and hands it on. It does not know what a sink does.
- `SinkList` owns the sinks with their thresholds and ids and offers a record to those that want it. Ids come from their own counter, so they are never reused.
- `Sink` is the seam. The tests' sinks implement it, and so do the two storm features.
- `Pattern` parses the format text once, when the sink is added, into literal and field parts. `FormattingSink` adapts a text destination (`LineSink`) to the `Sink` seam.
- `DedupSink` decorates a `Sink` and owns the run: the first record, the count held back, the time of the last repeat.

**Storm 1 in the reference:** two new classes (`Pattern`, `FormattingSink`) and one free function. `LoggerImpl` and `SinkList` did not change, because the logger only ever sees `Sink`.

**Storm 2 in the reference:** one new class (`DedupSink`) and one free function. Again nothing existing changed, and the new sink can wrap any other `Sink`, including a `FormattingSink`.

## Alternatives
- **Logger levels as an `enum` plus `if` chains** in each sink is the first thing most candidates write. A single `atLeast()` comparison used by the logger and the sink list keeps the ordering in one place.
- **A chain of handlers** (Chain of Responsibility) where each sink may consume the record. Right when sinks are ordered fallbacks or a filter must be able to veto; for fan-out with per-sink filters a list is simpler. Say which one you chose and why.
- **Formatter as a property of the logger** (`setPattern`) is the quickest design and is wrong the moment two sinks want different formats. A formatter per sink, behind the sink seam, is only slightly more code.
- **A `Formatter` interface with one implementation per format** is a fine Strategy when formats multiply (JSON, key-value). For one pattern language a concrete class is enough; do not build the interface until a second format exists.
- **Singleton logger with global access** is how most real code uses logging, and how most real code ends up untestable. Here the logger is an ordinary object; a global accessor can be added at the application edge.
- **Static log macros that capture file and line** are a practical addition in C++ (they cost nothing when the level is off) and a reasonable thing to mention as a follow-up. They are not part of the object model.
- **Dedup inside the logger** (one global window) would be a smaller diff for this storm but couples every destination to one policy. As a decorator it is per sink and composes.

## Trade-offs
Reading the clock once and sharing the `Record` costs one allocation of a small struct per accepted call, and it makes every sink agree on the time, which is what makes logs from different destinations join up. Parsing the pattern at configuration time makes `addLineSink()` able to fail (returning `-1` with no reason, since this toolchain has no exceptions) and makes the hot path allocation-light. A collapsing sink trades the exact record stream for a smaller log: the count of the last run is held in memory and is lost if the process dies without `flush()`.

The logger is single-threaded. Making it safe is a decision with a cost: a mutex around dispatch is easy but makes callers wait for slow sinks; a queue and a writer thread decouples them and forces a policy for a full queue.

## What breaks at 10x
At 10x the sinks (a dozen destinations) dispatch is a loop of virtual calls and stays cheap, but a slow sink slows every caller, so the first change is asynchronous writing. At 10x the rate (millions of lines a second), the per-record `std::string` allocations and the formatting dominate: use pre-sized buffers, format on the writer thread and sample or drop debug lines. At 10x the services, text logs stop being searchable: records need structured fields and a trace id, a local agent that ships them, and retention and sampling decided by the platform. The `Sink` seam survives all of these.

## Level signals
- **SDE2:** correct levels, sinks and thresholds; injects the clock; one timestamp per record; ownership with `unique_ptr`; tests the boundaries (inclusive threshold, dropped calls).
- **Senior:** asks about thresholds, defaults and the clock before drawing; keeps the logger, the sink list and the sink seam separate; adds formatting and de-duplication as sinks so the logger does not change; validates patterns up front; raises flush on shutdown and what is lost.
- **Staff:** discusses asynchronous logging, back-pressure and drop policy, structured and sampled logging, cost per line, and who owns retention; says why the interface is small enough to survive that.
