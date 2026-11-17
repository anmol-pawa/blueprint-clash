# Editorial: Movie ticket booking with seat holds

## Requirements
Functional: shows with a hall of rows and numbered seats (`A1` to `Z50`). `hold` reserves every listed seat or none, for a limited time. `confirm` turns a live hold into a booking, `release` gives it up, and the free seats can be listed. Time arrives through an injected `Clock` in whole ticks. A hold placed at `s` with duration `h` is live while `now < s + h` and over from `s + h`. Checks run in a fixed order (`UnknownShow`, `InvalidRequest`, `UnknownSeat`, `SeatUnavailable`) and confirm fails in the order `UnknownHold`, `WrongUser`, `HoldExpired`. Hidden until asked: the boundary tick, whether anything has to clean up, what a late confirm does, the check order. Non-goals: payment, pricing, cancellations, thread safety (discussed), persistence.

**Change Storm 1, best seats:** `holdBest(show, user, count)` picks adjacent free seats in one row by a rule: row closest to the middle, then run centred nearest the middle, then lower row, then lower seat. Revealable by asking whether customers will want "the best seats for four".

**Change Storm 2, per-user limit:** a cap on the seats a user has in a show, counting booked seats and live holds, checked after seat names and before availability.

## Reference design
- `Layout` is the hall's shape and the strict parsing and naming of seats. It knows nothing about people.
- `HoldWindow` owns the clock and the single definition of "live" (`now < expiresAt`). It also answers "when would a hold placed now expire".
- `Inventory` keeps one slot per seat (the id of the last hold that covered it, or the booking) and the hold records. Seat state is **derived**: Booked if booked, Held if the remembered hold is unspent and live, otherwise Available. `confirm` and `release` share one `settle` function that checks existence, owner and expiry in that order, then changes seats.
- `BookingImpl` is the facade: validate in the documented order, ask the policy, ask the inventory, place the hold.

**Storm 1 in the reference:** one new class, `SeatSelector` (a Strategy), with `CentreFirstSelector`, and one new method on the facade that uses the same `grant` as `hold`. The inventory is untouched; the selector sees only the layout and a "is it free" predicate, so the rule can change without knowing about holds or time.

**Storm 2 in the reference:** one new class, `UsagePolicy`, with `NoLimit` and `PerUserCap`, one new query on the inventory (`seatsInUse`, which uses the same liveness rule), and a factory. The facade asks the policy in the documented position. Storm 2 does edit the facade's `hold` method (one new check); the editorial says so rather than pretending it is a pure addition.

## Alternatives
- **A `std::set` of taken seats plus a map of hold-to-expiry**, with the free check inlined in each method, is what most first drafts are. It works until Storm 2: "does an expired hold count?" is then answered in three places.
- **A sweeper thread or timer per hold** frees seats on time but drags in locks, a race with confirm, and sleeping tests. Deriving state from `(hold, now)` removes the race by construction.
- **Eagerly freeing expired holds on every call ("reap, then act")** is fine and simple, and costs O(holds) per call unless an expiry heap is kept; the derived-state design costs nothing until a seat is touched.
- **A State pattern per hold** (Active, Confirmed, Released, Expired classes) is the textbook shape. Here the states have no behaviour of their own beyond who may move where, so a `spent` flag plus the expiry is enough; with extension or payment states (see follow-ups) classes or a transition table start to pay.
- **Seat objects with their own lock** are the natural concurrent design, and a request over several seats then needs ordered locking to avoid deadlock; per-show locking is simpler and is what the follow-ups ask for.
- **Choosing best seats by scoring every seat** is tempting but groups need adjacency; scanning runs per row is O(rows x seats x count), which is nothing for a hall and is worth saying out loud.

## Trade-offs
Derived seat state costs one clock read per seat check and in return needs no cleanup to be correct. Remembering only the last hold id per seat is compact and correct because a seat can have at most one live hold; the price is that old hold records stay in memory (here forever), which a production system purges after a grace period. The all-or-nothing hold checks every seat first and then writes, which is two passes but cannot strand seats. The usage count scans the show's seats: O(seats), fine for a hall of at most 1300, and replaced by a per-user counter if profiling says so. A `SeatSelector` Strategy costs one virtual call per request and buys a rule that product can change quarterly.

## What breaks at 10x
At 10x the shows the per-show lock partitioning keeps working; at 10x the customers on one show a single lock becomes the hot spot, so you queue admission and keep the seat map slightly stale. The expired-hold records pile up and need a purge. `seatsInUse` scanning a hall per request becomes a counter per (show, user). The in-memory state becomes a replicated store with a conditional write per seat, correctness moves into the database, and the clock must be a single source. Payment confirmation arriving after expiry becomes a state of its own (extend while paying), and a refund path is no longer optional.

## Level signals
- **SDE2:** all-or-nothing hold, correct boundary tick, confirm refuses an expired or wrong-user hold, seats freed without a timer or at least by a clear mechanism, one place that decides what "free" means.
- **Senior:** asks about the boundary, cleanup and late-confirm cases first; derives state from expiry so there is no sweeper race; checks in a documented order; the best-seat rule is a Strategy and the limit is a policy that reuses the same liveness rule; describes per-show locking and the check-then-place critical section.
- **Staff:** puts correctness in a conditional write in a shared store, discusses clock authority, thundering herd on a premiere (waiting room, stale seat map, idempotency keys), payment arriving after expiry and the extend-while-paying state, and reasons about abuse (hoarding, id guessing) beyond the limit.
