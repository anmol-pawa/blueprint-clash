# Editorial: Logger Framework

## Requirements
Functional: callers send `log(level, category, message)`. The library drops records below a logger-wide level, formats each remaining record into one line (`[time] LEVEL category: message`) and writes it to every sink whose own minimum the record meets, in the order the sinks were added. Hidden until asked: sinks have their own levels, the clock is injected and read once per *accepted* record, an empty category prints as `-`, line breaks are escaped so a record is always one line, a sink added later misses earlier records, and `accepted()` counts records that passed the logger's check even when no sink is attached. Non-goals: file rotation, network sinks, JSON, colours, async delivery, thread safety.

**Change Storm 1, per-category levels:** operators want to quiet a noisy subsystem or turn up one part, so `setCategoryLevel("db.pool", Level::Debug)` gives a dotted category and everything below it its own minimum. Whole segments only, nearest rule wins, `clearCategoryLevel()` removes a rule, and the logger-wide level and the rules are independent settings. Revealable by asking whether operators will want to tune it.

## Reference design
- `LevelGate` answers one question: does the logger accept a record of this level and category? It holds the logger-wide level and the category rules.
- `CategoryLevels` is the rule table: a map from dotted names to levels, and `find()` walks a category up its path (`a.b.c`, `a.b`, `a`) and returns the nearest rule. It knows nothing about records or sinks.
- `LineFormat` turns a time, level, category and message into one line, including the escaping. It knows the layout and nothing about where the line goes.
- `SinkSet` owns the destinations with their minimum levels and delivers a finished line to each in registration order.
- `LoggerImpl` is the facade and only sequences: gate, then read the clock once, then format once, then deliver. The clock is injected and owned.

**Storm 1 in the reference:** one new class (`CategoryLevels`) and a three-line change in `LevelGate::accepts()`, which now asks the rules first and falls back to the global level. The formatter, the sinks and the order of steps in `log()` do not change, and the cheap level check still happens before the clock is read.

## Alternatives
- **A singleton `Logger::instance()`** with a static `info(...)` is how many real libraries look, and the first thing candidates draw. It makes tests share state and hides the clock and the sinks. The interface here is an object you construct; a process-wide default is a one-line wrapper on top, not the core.
- **A `Level` hierarchy** (`DebugLevel`, `InfoLevel` subclasses) models four constants as classes. An enum with an ordering is enough: there is no behaviour that differs per level except the comparison. Reach for classes only if levels grow behaviour.
- **Each sink owning its formatter** is the real-world shape (a console wants colours, a file wants a full timestamp, a collector wants JSON). This exercise fixes one format, so the formatter is shared and runs once. When per-sink formats arrive, `SinkSet` hands each sink the record instead of the line, at the price of formatting once per distinct format.
- **A chain of `Filter` objects** (logger level, category, sink level, later regex and rate limit) is the textbook Chain of Responsibility. With three fixed checks it is more ceremony than value; `LevelGate` is the single place to turn it into a chain if filters become configurable.
- **Rules in a trie keyed by segment** answer `find()` in the depth of the path with no string copying. The map and the `rfind('.')` loop are O(depth log rules), and simpler to read; a trie is for a hot path with thousands of rules.
- **Observer with `std::function` sinks** (`addSink([](const std::string&){...})`) is lighter than an interface. It is a good answer; a named `Sink` class wins when a sink has state, such as an open file, and a destructor to flush it.

## Trade-offs
`log()` takes a message that has already been built, so a disabled `debug` call still pays for the string the caller formatted. Real libraries use macros or lazy callbacks so that the argument is not evaluated when the level is off. That is a real cost here, kept out of scope to keep the interface small. Escaping line breaks makes stack traces ugly on one line, in exchange for an invariant tools can rely on. Returning `nullptr` for a null clock and ignoring a null sink avoids exceptions (this toolchain has none) at the price of errors with no message.

A category rule replacing the logger-wide level (rather than combining with it, say by taking the stricter one) is a decision, not a law. Replacing lets an operator turn one subsystem up without touching the rest, which is the usual need; combining is safer if the logger-wide level is a safety floor. Either is defensible if stated, and the tests pin the first.

## What breaks at 10x
At 10x the records (a busy service, tens of thousands of lines a second): the string building and the sink writes dominate, not the level check. Writes block on I/O, so a slow sink stalls the caller; the fix is a bounded queue and a writer thread, with a stated drop policy when it fills. At 10x the categories (thousands of rules), the map plus segment walk is still cheap per call, but a rule change must not block loggers, so rules become an immutable snapshot swapped in atomically. At 10x the services, nobody reads files: lines go to a collector, which wants a structured format, trace ids and sampling, and the volume itself becomes a cost to budget.

## Level signals
- **SDE2:** correct levels, sinks and format; injects the clock; a sink interface rather than printing directly; asks about per-sink levels and what an empty category does.
- **Senior:** asks about the clock and about line breaks before drawing anything; keeps gate, formatter and delivery as separate small classes; reads the clock after the cheap check; gets segment matching and nearest-rule-wins right in the storm without touching the formatter or the sinks; raises failing and slow sinks unprompted.
- **Staff:** names the seams that were not built and why (per-sink formatters, a filter chain, async delivery), discusses the cost of building arguments for dropped records, hot-reloaded configuration as an immutable snapshot, and sampling and structure at fleet scale.
