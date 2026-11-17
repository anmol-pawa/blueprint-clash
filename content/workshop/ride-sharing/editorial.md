# Editorial: Ride sharing

## Requirements
Functional: drivers go online at a spot on a city grid; a rider requests a ride from A to B and is matched with the **nearest** available driver in reach; the trip moves **Matched, DriverArrived, InProgress, Completed**; the rider may cancel until the ride starts; after completion the rider rates the driver. The fare is a base plus a price per unit of Manhattan distance, quoted at request time. Failures are reported in a fixed order (UnknownTrip, WrongParty, BadState for trip operations) and a failed call changes nothing.

Non-functional: deterministic matching (ties to the lowest id), integer money and ratings (no floating point), no clock (nothing depends on the time of day), finished trips readable for ever.

Assumptions stated in the interview: one process, one thread, in memory; at most one open trip per rider; requests with no driver in reach are refused, not queued.

**Change Storm 1, surge pricing:** `makeSurgeDispatch(threshold, percent)`. When at most `threshold` drivers are Available at request time, the fare is multiplied by `percent / 100`, rounded down once, and fixed in the trip. Revealable by asking whether prices will change with demand.

**Change Storm 2, rated matching:** `makeRatedDispatch(threshold, percent, radius)`. Within the radius, the best exact average rating wins (unrated counts as 3), then the nearer driver, then the lowest id. Revealable by asking whether better drivers will ever be preferred over nearer ones.

## Reference design
- `geometry.h` holds the only definition of distance (`manhattan`) and of the grid (`onGrid`). Matching, reach and pricing all call it.
- `DriverPool` is the drivers: state (Offline, Available, OnTrip), spot, and the sum and count of their ratings. It hands out `Candidate` values (distance, rating as a sum and a count) and never makes a decision.
- `Trip` is one trip and its state machine. Each legal move is a method (`arrive`, `start`, `complete`, `cancel`) that checks one source state and returns false otherwise. It also guards "rated once".
- `TripBook` issues ids, keeps every trip for ever and tracks the riders who have an unfinished one.
- `Tariff` prices a distance with a surge percentage; `SurgePolicy` is a Strategy (`NoSurge`, `ScarcitySurge`) from the supply count to a percentage.
- `DriverMatcher` is a Strategy (`NearestMatcher`, `BestRatedMatcher`) with two questions: how far do you look (`reach`) and who do you pick (`choose`).
- `RideImpl` is the facade. It validates in the documented order, asks the pool for candidates within the matcher's reach, asks the matcher to choose, asks the policy for the percentage, then opens the trip. It holds no rule about distance, price, ratings or legal moves.

The central decision is where **driver location** changes. It changes at exactly three events: the driver goes online, the driver arrives (moves to the pickup), the trip completes (moves to the dropoff). A cancel releases the driver where they stand. Writing those three updates next to the transitions that cause them is what makes a cancel after arrival correct, and it is what most first drafts miss.

**Storm 1 in the reference:** `ScarcitySurge` is a new class and `Tariff::fare` already takes a percentage. `RideImpl` snapshots the Available count before matching and stores the final fare on the trip. **Storm 2 in the reference:** `BestRatedMatcher` is a new class; `Candidate` already carries a rating as a sum and a count, so no existing class changes behaviour.

## Alternatives
- **State pattern for the trip** (a class per state with virtual `arrive`, `start`, ...) is the textbook shape. Here the table is five states and four moves, and the moves have no behaviour of their own beyond "change state", so a method per move on one class is shorter, is easier to test from every state, and has no object churn. The State pattern pays for itself once each state carries different behaviour (an Offered state with timers, a Paying state with retries).
- **Compute the fare at completion** from the stored distance is the first thing many candidates write. It looks equivalent until surge, tolls or promotions arrive; then the quote and the charge diverge. Quote once, store, return.
- **Pick the driver with `min_element` inside `requestRide`** works for the base game and makes Storm 2 an edit to the facade. A `DriverMatcher` costs about ten lines and keeps the facade closed.
- **Floating-point ratings** (an average as a double) make ties and thresholds depend on rounding. Storing a sum and a count and comparing by cross-multiplication is exact and cheap; `rating()` reports rounded hundredths for display only.
- **A global lock now** is the honest choice for a 70-minute exercise. A lock per driver or per region is a scale-up design, discussed in the follow-ups, not built here.
- **A spatial index** (grid cells, geohash, k-d tree) is the right answer at 100,000 drivers and the wrong first answer here: it adds a structure that must be kept in step with every location change. Say where it would go (`DriverPool::availableWithin`) and why you are not building it yet.

## Trade-offs
- Matching and "take the driver" happen in one call with no gap, which is what prevents a double promise inside one process. The cost is that the whole facade is one critical section; the benefit is that there is no reservation-timeout machinery.
- Refusing a request with `NoDriver` is simple and honest, and gives the rider no queue position. Queueing is a different product decision (wait times, fairness, abandonment).
- Keeping finished trips for ever makes `state()` and ratings always answerable and makes memory grow without bound; a production system archives them.
- `availableWithin` returns a vector of candidates so the matcher stays a pure function of data; the price is an allocation per request.

## What breaks at 10x
- **Drivers 10x:** `availableWithin` and the surge count are O(drivers) per request. Add a spatial index and a running Available counter; both belong inside `DriverPool`, which is why nothing else touches the driver map.
- **Requests 10x:** one lock serialises everything. Shard by region; a driver belongs to one region at a time. Matching near a boundary needs a hand-off protocol.
- **Trips 10x:** `TripBook` keeps everything in a map. Move finished trips to cold storage and keep only open trips plus recent history in memory.
- **Contention on a hot area (an airport):** many requests chase the same few drivers; matching in batches (collect for a short window, then assign globally) beats first-come greedy matching, and changes the matcher's interface from one request to many.

## Level signals
- **SDE II:** nearest-driver matching with the right tie-break, a correct state machine, cancel releasing the driver, a fare that matches the table. Misses on where the driver is after a cancel, or on checking who is calling.
- **Senior:** all of the above plus a failed call that changes nothing, a stored quote, a matcher Strategy before being asked, and Storm 1 and 2 as additions rather than edits. States the thread-safety story out loud.
- **Staff:** names the hot path and its index, discusses matching across processes (compare-and-set on the driver record, runners-up from the matcher), batch matching for hot spots, and what the abstractions would have to become for offers, timeouts and surge by region.
