# Editorial: Logger Framework

## Requirements
Functional: `log(level, category, message)` produces one line, `[LEVEL] category: message`, and delivers it to every attached sink whose own minimum allows it, in the order the sinks were added. A logger-wide level, starting at Debug, drops a record for everybody before any sink is asked. Hidden until asked: the exact line layout (and the empty-category variant), the order and late-sink rules, how the two kinds of level combine, and that a null sink is refused with `false`. Non-goals: real console or file sinks, timestamps, configuration files, thread safety (discussed, not built).

**Change Storm 1, categories:** `setCategoryLevel("net.http", Level::Debug)` gives a dotted category its own level, used for it and everything below it. The most specific configured ancestor wins, `net` is not an ancestor of `network`, and a category may open a noisy area up as well as silence one. Sink minimums apply afterwards. Revealable by asking what real services want next.

**Change Storm 2, collapsing sinks:** `addCollapsingSink` writes the first line of a run of identical lines, holds the rest back, and writes `(last message repeated N times)` when the run ends or on `flush()`. The run is per sink and counts only lines that reach that sink.

## Reference design
- `LineFormatter` is the one place that knows the line layout.
- `LevelPolicy` decides whether a record is produced at all: the logger-wide level and the per-category levels. It knows nothing about sinks.
- `Handler` is the link of a delivery chain, and each sink gets its own chain: `MinLevelFilter` (the sink's minimum) then, optionally, `RepeatCollapser`, then `SinkWriter`. Each link decides whether to pass the line on.
- `LoggerImpl` is the facade: ask the policy, format once, hand the line to each chain head in order. Adding a sink builds a chain. `flush()` asks each chain to flush.
- `logger.cpp` holds three tiny factories that return the same implementation behind three interfaces.

**Storm 1 in the reference:** `LevelPolicy` gains a map and a path walk; `LoggerImpl` gains two forwarding methods. No chain and no sink code changes, because levels per category are a property of the record, decided before delivery.

**Storm 2 in the reference:** one new class (`RepeatCollapser`) and one conditional line in `attach()`. The collapsing link sits after the level filter, so only lines that reach the sink count towards a run, and its state lives in the chain of the sink it belongs to. `MinLevelFilter`, `SinkWriter` and the policy do not change.

## Alternatives
- **One `log()` loop with `if (level >= sink.min)`** is exactly right for the base problem and the first thing an interviewer expects. It starts to hurt at Storm 2, where per-sink state (the last line, the count) has to go somewhere; the monolith in the bad designs shows how that ends up as flags on a slot struct and checks scattered through one function.
- **A single linked list of handlers where the first match stops the walk** is the textbook Chain of Responsibility and the wrong shape for the top level: a log line goes to every sink, not the first. The reference uses a broadcast list at the top and real chains inside each sink. Say that out loud: it shows you know the pattern's definition rather than its name.
- **Sink subclasses with their own level and collapse flag** (`CollapsingConsoleSink`, `CollapsingFileSink`) multiply classes per destination and per behaviour. Putting behaviour in the chain keeps sinks to one method and makes behaviours combinable.
- **A `Decorator` around `Sink`** (a `CollapsingSink` that wraps a sink) is a very close alternative and a fine answer. The reference's `Handler` carries the level so a link can filter, and gives the logger one type to hold; with a decorator the logger would store sinks and each decorator would need to learn about levels.
- **A global singleton logger with `Logger::instance()`** is common in production code and hard to test: state leaks between tests and the order of tests matters. A factory plus an explicit instance is the testable form; the application can still keep one global on top.
- **Matching categories with regular expressions or globs** is more flexible and gives overlapping rules that need a precedence order. The dotted hierarchy is total: the answer is the first hit when walking up the path.

## Trade-offs
Sinks receive a finished string, which keeps a sink to one method and a test double to three lines, and costs structured logging: a JSON sink would want fields, not a line. Formatting once for all sinks is cheap and consistent; formatting per sink is more flexible and repeats work. The policy decides before formatting, so a dropped record costs a map lookup per path segment and never builds a string; that is the right trade for a logger whose Debug calls are most of the volume. Holding back repeats saves volume and loses nothing but timing: the first occurrence is written at once and the count follows later, and the pending count needs a `flush()` at shutdown or it is lost.

Returning `bool` from `addSink` avoids exceptions (this toolchain has none) at the cost of an error without a reason.

## What breaks at 10x
At 10x the sinks (dozens of destinations) the loop is still O(sinks) per line, and the slowest sink sets the speed of every caller. The next step is to decouple: a bounded queue per sink and a writer thread, with a stated policy when the queue is full (block, drop oldest, drop newest and count). At 10x the categories the path walk is O(depth) map lookups, fine; a trie or a cache keyed by category string is the first optimisation if profiling shows it. At 10x the volume the cheapest line is the one never produced, so level checks must be inlined at the call site (a macro or a `isEnabled(level, category)` test before building the message), and repeats become sampling and aggregation. At 10x the services, strings give way to structured records with trace ids, shipped by a local agent that buffers to disk; levels are changed at runtime from a control plane.

## Level signals
- **SDE2:** correct fan-out, both level checks, the exact line format, null handling; separates formatting from delivery; can explain why the sink is an interface.
- **Senior:** asks what a sink receives and how the two levels combine before coding; keeps policy, delivery and facade apart; handles dotted ancestry correctly (no `network` bug) and puts per-sink state next to its sink; notes that Chain of Responsibility is the inside of each sink, not the top-level fan-out.
- **Staff:** names the cost model (volume times retention) and moves work out of the hot path: call-site level checks, queues with a stated overflow policy, structured records, runtime level control and sampling; discusses flush on shutdown and crash loss unprompted.
