# Editorial: Ride sharing

## Requirements
Functional: drivers sign on at a point on an integer grid, riders **request** a ride between two points, and the service **matches** the nearest idle driver within 20 units (ties to the name that sorts first). A trip moves Matched, InProgress, Completed, or Matched, Cancelled. Only the rider cancels and only while Matched; only the matched driver starts and completes. Starting puts the driver at the pickup; completing leaves them idle at the destination and charges the fare, which is a base plus a price per unit of pickup-to-destination distance, quoted at matching. Drivers can sign off only when idle. Checks run in a fixed order everywhere (documented in `api.h`). Hidden until asked: the metric, the range boundary, the tie-break, who counts as eligible, what a failed request leaves behind, and what a driver does after a trip. Non-goals: maps and ETAs, payment, surge, pooling, push, thread safety (discussed), persistence.

**Change Storm 1, ride classes:** `makeClassedService()`. Each driver offers one class; a ride is matched only inside its class; the fare is the base fare times 100, 140 or 200 percent. Revealable by asking whether all cars are the same.

**Change Storm 2, arrival and cancellation fees:** `makeFeeService(fee)`. A trip can be *arrived*; cancelling an arrived trip adds a fee to what the rider owes, cancelling earlier is free, and start still works with or without arrival. Revealable by asking whether riders pay for cancelling when the driver is waiting.

## Reference design
- `Grid` owns space: whether a point is on the grid and the distance. Matching and pricing both ask it, so changing the metric is one edit.
- `Roster` is the drivers: point, class, and Idle, Busy or Offline. It answers one question for matching: which idle drivers of a class are within a distance of a point. It knows nothing about trips.
- `Matcher` is a Strategy (`NearestDriver`) that picks from candidates, so "highest rated" or "least recently busy" is a new class.
- `TripMachine` is the table of legal moves: which step is allowed from which state. The facade asks it before every transition; there is no `if (state == ...)` scattered through the service.
- `Trips` keeps records, issues ids in order and answers "does this rider have an active trip". Finished trips stay, so their state can be asked.
- `Fare` prices a trip, including the class multiplier. `CancelFee` is a Strategy (`NoCancelFee`, `FeeOnceArrived`).
- `RideServiceImpl<Iface>` is the facade of the base game: it validates in the documented order and sequences the collaborators. It holds no rule of its own about distance, money, fees or which driver is chosen. It is a class template over the interface of the phase being served, so `ClassedServiceImpl` (two methods) and `FeeServiceImpl` (three) add each storm as a thin layer instead of growing one class past what a reviewer can hold in their head.

The central decision is the **trip state machine as data** and the **driver's own small state machine kept apart from it**: a trip and a driver are two things with two lifecycles that must stay in step (matching makes a driver Busy; cancelling and completing make them Idle), and the design says where each of those side effects happens.

**Storm 1 in the reference:** `RideClass` is a field the roster already stores and the query already filters on, and `Fare` gains a multiplier. The honest cost is that the roster was built with the field in mind; a design that had a boolean "available" and an untyped driver would have to change its matching query and its constructor. **Storm 2 in the reference:** `CancelFee` is a new class, and `arrived` is a flag on a Matched trip, so the public `TripState` enum and every earlier test stay the same. The cost of the flag is that "Matched" now means two things (waiting for the driver and driver waiting), which `isArrived` makes explicit.

## Alternatives
- **A State class per trip state** (`MatchedState`, `InProgressState`, ...) with virtual `cancel`, `start`, `complete`. It is the textbook answer and is worth it when each state carries data and behaviour (timers, per-state fees, notifications). Here each state differs only in which transitions are legal, so a table says it in a few lines. Say both, and say what would flip your choice.
- **Boolean `available` on the driver** is what most first drafts use. It cannot tell Offline from Busy, so signing off mid-trip or matching an offline driver slips through.
- **A spatial index (grid cells, geohash, quadtree)** for finding candidates. The reference scans all drivers, which is right for the tests and the first thing to replace at scale (10x section).
- **A global `std::priority_queue` of drivers by distance** does not work: distance depends on the request, so a heap keyed once is wrong for every other pickup.
- **Claiming the driver and creating the trip as two steps** invites a race and a leaked driver on failure; the reference changes state only after every check has passed.
- **Surge, pooling, ratings** each belong behind a seam named in the reference: pricing in `Fare`, choice in `Matcher`, and pooling changes the trip itself (many riders per driver), which is a different design.

## Trade-offs
A table-driven `TripMachine` is cheap to read and to extend by one row, and gives up per-state behaviour objects; if every state grows its own logic, switch. Keeping `Roster` and `Trips` apart makes the two lifecycles explicit and costs the facade the job of keeping them in step. A linear scan for candidates is simple and correct and gives up latency. Quoting the fare at matching makes the price predictable and gives up automatic price changes when the route changes. Keeping `arrived` as a flag keeps the old enum and old callers working, at the price of an overloaded "Matched".

## What breaks at 10x
At 10x the drivers, scanning every driver per request is the first thing to fail: index drivers by grid cell, search the cell and its neighbours outward, and stop at the first ring that has a candidate. Location is hot data: drivers report every few seconds, so keep it in memory sharded by region, not in the trip database. At 10x the request rate the choose-and-claim step is the contention point: two requests can both pick the same idle driver, so claiming must be an atomic compare-and-set per driver (or one lock per region), and the loser should retry with the next candidate. A driver who never answers needs a timeout and a re-match, which brings a clock into the machine. Ids need to come from a service rather than a counter in one process. Nothing in the in-memory `Trips` is ever purged.

## Level signals
- **SDE2:** the distance and range stated and used consistently, only idle drivers matched, a failed request that changes nothing, a cancel that frees the driver, only the right party able to move a trip, checks in the documented order.
- **Senior:** asks about eligibility, ties and what happens to a driver after a trip before coding; makes the trip's legal moves explicit (table or State) and keeps the driver's lifecycle separate; puts matching and fees behind Strategies when the change arrives; changes behaviour only for the new calls; names the lock around choose-and-claim.
- **Staff:** explains why a spatial index and a regional shard follow from the access pattern, treats location updates as a separate high-rate stream with its own store, puts claiming a driver in a compare-and-set, designs timeouts, re-matching and idempotent requests, and says how pooling (many riders per trip) changes the model.
