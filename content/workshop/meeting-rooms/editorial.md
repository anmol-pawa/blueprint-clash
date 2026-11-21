# Editorial: Meeting room scheduler

## Requirements
Functional: add rooms (name, seats); book a meeting in a named room for a half-open span with a head count; cancel it; ask `isFree`, list a room's `bookings` in start order and find a booking's room with `roomOf`. Then let the system choose the room, and then meetings that repeat.

Hidden in the brief and revealed by good questions: half-open spans (back-to-back is fine, one minute of overlap is not); the validation statuses and their order (`InvalidInput`, `UnknownRoom`, `DuplicateBooking`, `TooManyPeople`, `Conflict`) and that a refused call changes nothing; that exactly the capacity fits; that a cancelled id is free again; and that `isFree` is false for a nonsense span or an unknown room.

**Change Storm 1, automatic room choice:** `bookAny` picks the smallest room with enough seats that is free for the whole span, the first added among equals; `TooManyPeople` (nothing is big enough) differs from `NoRoomFree` (big enough rooms are all busy); the output argument is untouched on refusal; the result is an ordinary booking.

**Change Storm 2, repeating bookings:** `bookRepeating` with a step and a count, all or nothing, one booking with one id for the whole series, `cancel` removes what remains, and `cancelOccurrence` removes one with indexes that never shift.

## Reference design
`SchedulerImpl` is a thin facade: it builds a `BookingRequest`, validates it, finds the `Room`, checks capacity, asks whether every occurrence is free and only then commits. It contains no interval arithmetic. `Span` owns the one overlap test, `a.start < b.end && b.start < a.end`. `Calendar` is an ordered map from start to `Slot`; because slots in a room never overlap, a new span can only clash with its two neighbours, so `isFree` is O(log n). `Room` bundles name, seats and calendar; `RoomDirectory` keeps rooms in the order they were added. `BookingIndex` maps each live id to its room and the number of occurrences left, so `cancel`, `roomOf` and `cancelOccurrence` do not search.

A single booking is a series of one: `book` calls the same path as `bookRepeating` with a step equal to the meeting's length. That is why storm 2 added one class' worth of parameters (`BookingRequest`'s step and count) and one method to the facade, and left `Calendar` and `Span` untouched. `RoomChooser` is a Strategy and `BestFitChooser` its one class; storm 1 added the interface, the class and `bookAny`. Changing the rule to first fit or "prefer the building's rooms" is a new class, not an edit.

## Alternatives
- **Linear scan of a vector per room.** The simplest thing that is right, and fine for a few dozen meetings. `isFree` is O(n) and a sorted vector needs O(n) insertion; an ordered map is the same code size and scales better.
- **Sorted vector with binary search.** Better cache behaviour and O(log n) lookup, O(n) insert and erase. A good choice when bookings are read far more often than written.
- **Interval tree or segment tree.** Answers "any overlap" and "what overlaps" in O(log n) and handles overlapping intervals, which one room never has. Worth it for a global "is any room free" index across thousands of rooms, overkill per room.
- **Per-minute bitmap or array.** O(span) check, trivial code, and 10^6 minutes is 125 KB per room as bits. Exact and very fast for short spans, wasteful for sparse rooms and awkward if the resolution gets finer.
- **Series stored as a rule instead of expanded occurrences.** One row for 'every 7 days, 12 times', which scales to unbounded repetition, but every query must expand the rule, and exceptions and overlap checks against rules need their own structure. With a cap of 52 and exact answers expected, expanding on write keeps one calendar and one overlap test.
- **One class with a `switch` for how to pick the room.** A good first draft for a single rule; the second rule adds a branch to a method that also checks capacity and clashes.

## Trade-offs
- **Check everything, then write.** A refused call never leaves half a series behind and the commit loop cannot fail. The price is that the checks must be complete and in the documented order.
- **Series expanded into slots.** Every occurrence is a slot with the series id and an index. Listing, clash checks and cancel-one are the same code as for single meetings; memory grows with the count, capped at 52.
- **Index of live bookings beside the calendars.** `cancel` and `roomOf` are O(log n) instead of a search over rooms, at the cost of keeping two structures in step. They are updated in one place (`BookingIndex`) with the calendar edit next to it.
- **Best fit is a greedy online rule.** It protects big rooms but cannot be optimal for a stream of requests; the Strategy makes the rule replaceable, not better.
- **Minutes as `int`.** Exact and cheap, but a real system stores instants and zones. The core stays valid under that layer.

## What breaks at 10x
- **Rooms:** `RoomDirectory::find` and `BestFitChooser` scan every room. Index rooms by name (hash map) and keep rooms ordered by capacity; for "any free room" use a per-building index or an interval tree keyed by time.
- **Series:** with unbounded repetition, expansion is too big; store rule plus exceptions and expand over the query window. All-or-nothing then means checking a rule against existing meetings, not a loop over a fixed list.
- **Threads:** check-then-book must be atomic. Use a lock per room taken in a fixed order for anything touching several rooms (series in one room are fine, `bookAny` reads many), or a single writer; in a database use an exclusion constraint on (room, time range).
- **Time:** daylight saving and zones break "every 24 hours" as a meaning of "every day". Keep the minute core as instants and expand local rules above it.
- **Volume:** shard by building; keep best-fit searches on replicas and commit with an optimistic retry on conflict; publish booking events asynchronously.

## Level signals
- **SDE II:** half-open spans stated and tested at the edges, the statuses checked in a sensible order with a refused call changing nothing, capacity boundary right, an ordered calendar with a neighbour check (or an honest linear scan with the cost named), and cancel freeing the id.
- **Senior:** all of the above plus `bookAny` as a Strategy with the TooManyPeople versus NoRoomFree distinction, a series treated as one booking (all or nothing, check first and write after, one id, stable occurrence indexes), and a single booking expressed as a series of one so the new feature added code instead of changing old branches.
- **Staff:** frames the choices (map versus tree versus bitmap, expanded versus rule-based recurrence, greedy versus optimal allocation), raises concurrency with a lock order or a database constraint, and extends to time zones and RRULE exceptions, sharding by building and event-driven invitations, naming what each choice gives up.
