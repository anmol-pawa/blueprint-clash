# Editorial: Movie ticket booking with seat holds

## Requirements
Functional: shows with `rows x seatsPerRow` seats, numbered row by row. `hold` claims all requested seats or none, for a fixed period measured on an injected `Clock`; `confirm` turns a live hold into bookings; `release` gives it up; `seatState` and `freeSeats` read the result. Checks run in a fixed order: unknown show, bad seats (empty, repeated, out of range), too many (more than 6), seat taken. `confirm` and `release` check: unknown hold (never issued, or already spent), not the owner (the hold stays live), expired (nothing touched). A hold is live while `now < madeAt + period`; its seats are free again at that tick with no cleanup call. Hidden until asked: the exact deadline tick, what a late confirm does, the check order, that spent ids are dead. Non-goals: payment, prices, refunds, persistence, thread safety (discussed).

**Change Storm 1, more time:** `extend` gives a live hold a fresh full period from now, once, with checks in order unknown, not the owner, expired (no reviving), already extended. Revealable by asking whether customers need more time to pay.

**Change Storm 2, best available:** `holdBest(show, user, count)` holds `count` adjacent seats in one row: the lowest row that fits, then the lowest starting seat, never across a row boundary. `seatsOf` lists a live hold's seats. Revealable by asking whether customers will ask the system to pick.

## Reference design
- `SeatMap` is one show's geometry plus one cell per seat: which hold claims it and whether it is booked. It knows nothing about time or customers.
- `HoldLedger` owns every `HoldRecord` (show, user, seats, deadline, extended, spent), the `Clock` and the hold period. It is the only code that compares time: `lapsed`, `isLive`, `extend`.
- `ServiceImpl` is the facade. It validates a request, asks `isFree` (cell not booked, claiming hold not live), claims, and for `confirm` and `release` runs one shared precondition (exists and not spent, owner, not lapsed) before touching any seat.
- A seat claimed by a lapsed hold simply reads as free: nobody has to clean up, and a new hold overwrites the stale claim. A stale `confirm` is refused before it reads any seat, so it cannot steal the new holder's seats.
- `SeatAllocator` is a Strategy for `holdBest`; `FirstRunAllocator` scans rows in order and finds the first run of free seats inside a row.

**Storm 1 in the reference:** one method on the ledger (`extend`, which resets the deadline from now and sets a flag) and one method on the facade that runs the same precondition order as `confirm`. Seats, allocator and the lapse rule are untouched.

**Storm 2 in the reference:** one new class (`SeatAllocator` and its implementation), one new facade method and `seatsOf`. The facade passes the allocator a predicate `isFree`, so the allocator needs no knowledge of holds or clocks.

## Alternatives
- **One class with `map<seat, state>` and a deadline per seat** is the usual first answer. It works for one-seat holds; it makes group holds, `extend` (which seats move together?) and a stale confirm hurt, because there is no object for the hold.
- **Eager expiry with a sweeper thread** frees seats on time and can notify, but needs locks, a non-deterministic test and a catch-up on every read anyway (a sweep may be late). Lazy checks with an optional sweep are deterministic under a fake clock.
- **Seat has a `State` class hierarchy (Free, Held, Booked)** reads like the textbook. Held depends on time and on the hold, so the seat would need the ledger; that coupling is what the cell-plus-ledger split avoids.
- **Hold as a database row with a TTL** is the production shape; the in-memory ledger is the same contract. It changes what 'atomic' means (a conditional update), not the rules.
- **Optimistic seat selection (no holds, conflict at payment)** avoids the lapse logic and gives a bad experience: people reach the payment step and lose the seat. Holds trade inventory lock-up for a better experience.
- **Allocator as an `enum` and `switch`** is fine for one rule; a Strategy pays off when 'best' becomes several rules (aisle, centre, keep singles from being orphaned), which product will ask for.

## Trade-offs
Lazy expiry with absolute deadlines keeps every operation O(seats touched) and deterministic, and costs memory for old `HoldRecord`s (they are never removed here; a sweep or an eviction of spent holds fixes that) and an O(seats) `freeSeats`. Keeping the claim on the seat and the liveness in the ledger makes a stale claim harmless without cleanup, and makes every read ask the ledger; a live counter per show would make `freeSeats` O(1) but needs the sweep to stay correct. Remembering spent and lapsed ids is what lets `confirm` say Expired and UnknownHold apart, and costs memory proportional to all holds ever made. A fixed period for all holds is simple and unfair to slow payers, which `extend` softens at the price of letting someone hold seats up to twice as long.

## What breaks at 10x
At 10x the load the single map is a hot spot: shard by show (shows never interact), one writer per show, and keep per-show data small. At 10x the holds the ledger grows without bound: drop spent holds after a grace period and run a sweep (heap or wheel with stale checks) that also frees memory. At 10x the hall size `freeSeats` and `holdBest` scanning every seat is too slow: keep per-row free-run summaries or a bitset per row, updated at claim and at sweep time. At 10x the servers the in-memory ledger no longer arbitrates: the check-and-claim becomes a conditional write in a shared store, and the hold deadline becomes a TTL or a column compared in that write. The contract in `api.h` does not change; the implementation of `SeatMap` and `HoldLedger` does.

## Level signals
- **SDE2:** all-or-nothing holds, correct deadline tick, owner check, confirm after lapse refused, a clear idea of how the seats come back without a call.
- **Senior:** asks about lapse, late payment and ownership before coding; one place decides 'live'; stale confirm cannot touch seats; terminal states reject later transitions; `extend` reuses the same precondition order; allocator is a replaceable rule; names the cost of lazy expiry and the O(n) `freeSeats`.
- **Staff:** reasons about the atomic check-and-claim across processes (conditional writes, TTL), the payment-versus-hold-deadline race and its two resolutions, hot-show contention (waiting room, per-show sharding, stale seat maps in the UI), and what to measure (conflict rate, hold-to-payment conversion, abandonment).
