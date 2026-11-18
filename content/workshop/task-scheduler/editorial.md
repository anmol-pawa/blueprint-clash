# Editorial: Task scheduler (cron)

## Requirements
Functional: schedule a one-shot job (id, tick, priority, callable); cancel it; move simulated time with `advanceTo(t)`, which runs everything due; ask `now()`, `pending()` and `nextRun(id)`. Then recurring series and per-series catch-up policies.

Hidden in the brief and revealed by good questions: the exact running order (time, then higher priority, then first scheduled, never by name); that "due" means at most `t` and that `now()` inside a job is the job's own tick; that the clock never goes backwards; the validation statuses and their order, with `InThePast` strict and a time equal to now allowed; that a job leaves the pending set when it starts, so its id is free and it may reschedule itself; and that jobs may schedule and cancel while running, with new due work joining the same advance in its proper place.

**Change Storm 1, recurring jobs:** `scheduleEvery` at a fixed rate from the first time, one pending job per series, cancel ends the series (also from inside it), every due occurrence runs, the series keeps its place in the FIFO order, and one callable with its own state runs every time.

**Change Storm 2, missed occurrences:** `All`, `Latest` and `OnTimeOnly` per series; skipped occurrences are neither run nor counted; the series carries on; one-shots always run.

## Reference design
`SchedulerImpl` validates, hands out a scheduling rank and delegates; it contains no ordering logic. `SimClock` is the only owner of "now". `Entry` is the pending job as a plain value (id, tick, priority, rank, `Cadence`, `CatchUpPolicy`, shared callable). `RunQueue` keeps an ordered map keyed by (tick, negated priority, rank) and an index by id, and updates both inside `insert`, `remove` and `popDue`, so they cannot disagree. `Dispatcher::runDue` is the loop: pop the next due entry from the live queue, put the successor of a recurring entry back, set the clock to the entry's tick, ask the policy whether this occurrence should run, call the job, count it. The loop never holds an iterator across user code, so a job can do anything to the scheduler.

`Cadence` answers "does it repeat, and when is the occurrence after this one" and the successor keeps the rank. `CatchUpPolicy` is a Strategy with three one-line classes (`RunAll`, `RunLatest`, `RunOnTime`) chosen from a table by the public enum, and one-shots use `RunAll`. Adding a policy is a class and a table entry; the dispatcher is untouched. Storm 1 changed `Entry`, `Dispatcher` and added `Cadence`; storm 2 added the policy classes and one argument. That is the Open/Closed score of the design.

## Alternatives
- **Binary heap plus lazy deletion.** `std::priority_queue` is smaller and just as fast for insert and pop, but it cannot remove by id, so cancel marks the entry dead and the pop loop skips dead ones. `pending()` then needs a separate counter and `nextRun(id)` a side table. Fine, and more state to keep consistent; the ordered map answers every query exactly.
- **Timing wheel.** Constant-time insert for timers within a window, popular in kernels and network stacks that hold millions of short timers. It trades exact ordering inside a slot for speed, and needs a hierarchy for long delays. Wrong for a few thousand jobs where order is part of the contract; the right answer at 10x.
- **A virtual `Job` base class instead of `std::function`.** More ceremony, but a job can have a name, a description and a `cancelled()` hook. Reasonable if jobs need identity beyond an id; a callable keeps the interface small.
- **Recurring jobs as "reschedule yourself".** A recurring job is a one-shot that schedules its successor. It works (the tests show a job can do it) and then pending(), cancel and the fixed rate are the caller's problem: a series has no stable identity, a cancel can miss the gap, and the rate drifts as soon as the body is slow. A series is a first-class thing owned by the scheduler.
- **An enum plus a `switch` for the catch-up policy.** One method, no classes. It is a perfectly good first draft; the loop is also where the next policy would add a branch and the next off-by-one. The Strategy keeps the loop stable.

## Trade-offs
- **Pop before run, queue the successor before running.** The queue is in its final state whenever user code runs. The cost is that a recurring job's id is "taken" and a one-shot's is "free" while they run, which is the behaviour the contract documents.
- **Shared callable.** Copies of an entry share one callable so that a job's captured state survives from occurrence to occurrence; the price is that the job must not assume that every call sees a fresh copy.
- **Rank on the entry.** One counter gives deterministic FIFO among equals and a series keeps its place; a 64-bit counter is enough for ever. The alternative, a timestamp, ties and can go backwards.
- **Strict history in the interface.** A refused call changes nothing, statuses have an order, and time cannot go back. These are the contract that makes a scheduler something other code can build on.
- **Single thread.** Everything runs on the caller's thread, so a slow job delays the rest and there is no locking. That is the contract of this problem, not the right answer for a production scheduler.

## What breaks at 10x
- **Timers**: a million pending jobs makes node-per-entry maps heavy (cache misses, allocation per insert). Move to a heap in a vector with an index, or a hierarchical timing wheel; ordering within a slot needs a rule.
- **A long catch-up** over a short period (advance a year over a 1-tick period) is billions of runs for `All`. The policy decision has to be made before the loop (`Latest` can jump straight to the last occurrence by arithmetic instead of walking), and `All` needs a cap or a back-pressure story.
- **Threads**: the queue needs a mutex held only while popping and inserting, never while a job runs; run jobs on a pool and the guarantee becomes "start order". Same-series occurrences must not overlap, which is a rule, not an accident.
- **Time**: wall clocks step (NTP, suspend, daylight saving). Use a monotonic source for intervals and calendars only for "9am local" rules.
- **Durability**: restart loses everything. A persistent scheduler keeps rows with a due time, claims them with a lease and runs them at least once, so jobs need an idempotency key (id plus occurrence time).

## Level signals
- **SDE II:** one-shot jobs correct: ordered container with an id index, running order including FIFO ties, `now()` rules, cancel and duplicate handling, and the loop taking the next due job from the live queue so a job can add work. Names the boundary cases (`<=`, equal to now) before being asked.
- **Senior:** all of the above plus recurring jobs as a first-class series with a fixed rate, correct self-cancel, no state lost between occurrences, and the catch-up storm absorbed by a Strategy with no change to the loop. Explains why the successor goes in first, and that skipped occurrences are not counted.
- **Staff:** frames the design choices (heap vs map vs wheel, exact order vs throughput, per-series serialisation), talks about the single-thread contract and its change for a pool, and extends to a durable, partitioned scheduler with leases, idempotency and clock skew, naming what is given up (global order, exactly-once).
