# Editorial: Ride sharing

## Requirements
Functional: drivers with a position who can go online and offline; riders who request a trip from one point to another on a grid; a **nearest-driver match** within 10 blocks, ties to the lowest name; a price returned up front (310 plus 125 per block, in cents) and fixed from then on; and a **trip state machine**: Matched, Arrived, InProgress, Completed, or Cancelled. The driver reports arrived, start and complete; the rider can cancel until the ride starts (free while Matched, a flat 200 once the driver has Arrived). Every call checks UnknownTrip, then WrongParty, then InvalidState. Finished trips stay inspectable. Hidden until asked: the distance metric and the pickup limit, the tie-break, what the match does to the driver, where the driver is after a trip, what cancelling costs and when. Non-goals: payment, ratings, ETAs and traffic, persistence, thread safety (discussed).

**Change Storm 1, surge pricing:** `makeSurgeRides()`. A multiplier of 100, 150 or 200 percent from the share of online drivers who are busy at the moment of the request, read before the new driver is taken, rounded down once, and fixed on the trip. Revealable by asking whether prices will change when the city is busy.

**Change Storm 2, declines:** `makeDecliningRides()` adds `decline(trip, driver)`. The decliner is freed, never offered this trip again, and the trip is re-matched by the same rule at the same fare; if nobody is left the trip is cancelled. Revealable by asking whether drivers can turn a trip down.

## Reference design
- `grid.h` owns the meaning of space: distance in blocks and whether a point is on the map.
- `DriverRoster` is the drivers: position, online, busy; it also answers the two market counts and who is idle. It knows nothing about trips or prices.
- `Matcher` is a Strategy (`NearestMatcher`): it ranks the candidates the roster hands it and applies the pickup limit. It never sees trips.
- `FarePolicy` is a Strategy (`FlatFare`, `SurgeFare`) that prices a trip from its length and a small `Demand` value, so it is a pure function and needs no roster to be tested.
- `TripLifecycle` is the state machine as one table of legal moves, and `TripLedger` keeps every trip for good and issues ids.
- `RidesImpl` is the facade: it validates in the documented order and sequences the others. It holds no rule of its own about distance, price or legal moves.

The central decision is that **each thing that changes for a business reason has its own home**: who is chosen (`Matcher`), what a trip costs (`FarePolicy`), which moves are legal (`TripLifecycle`). The two storms then land in exactly one place each.

**Storm 1 in the reference:** `SurgeFare` is a new class and `makeSurgeRides` plugs it in. The only existing line that matters is the order in `requestRide`: the market is read before `setBusy`, and the fare is stored on the trip. **Storm 2 in the reference:** `decline` is one new method; the decliners are remembered on the `Trip`, and the re-match is the same call to the same `Matcher` with those drivers filtered out of the candidates. The honest cost is that the matcher was handed a list of candidates (not the roster) so that filtering stays outside it; a design whose matcher reached into the roster would need a new parameter.

## Alternatives
- **A `switch` or `if` chain on the trip state in each operation.** Quicker for the base game, and every new operation then has its own idea of what is legal. A table of moves in one place costs a dozen lines and makes `cancel_in_progress`-style bugs a one-row diff.
- **A State class per stage** (`MatchedState`, `ArrivedState`, ...). The textbook shape, and worth it when each stage has behaviour of its own (a timer, a message, a different fee). Here the stages differ only in which moves are allowed and in one fee, so the table is smaller and as clear; this editorial would choose State objects the day an `Arrived` trip needs a no-show timer.
- **Matching inside the facade** as a loop with a distance comparison. It works for the base game and then has to be copied into the decline path; two copies of a tie-break drift apart.
- **A global 'unavailable' flag on the driver** for decliners. It blocks them for every rider and needs a timer to clear. The fact is per trip, so it lives on the trip.
- **Computing the price at completion** from the market then. It makes the price the rider sees a guess; a quoted price has to be stored.
- **Scanning every driver** is right for the tests and wrong for a city: see 10x.

## Trade-offs
A small interface for the matcher costs one class and a `Candidate` struct and makes the rule replaceable, testable alone, and shared by the request and re-match paths. Handing the fare policy a `Demand` value rather than the roster costs a few lines in the facade and keeps pricing independent of how drivers are stored. A table-driven lifecycle trades the flexibility of arbitrary per-state code for a rule you can read in ten lines; the price is that behaviour that really differs per stage (the late fee) is still an `if` in the facade, and that is stated, not hidden. Keeping finished trips forever makes state machine bugs observable and costs memory that a real system would archive.

## What breaks at 10x
At 10x the drivers the scan in `idle()` and `riderIsTravelling` (O(drivers), O(trips)) are the first to go: index idle drivers by a geo cell, search the rider's cell and the neighbouring ring, widen if needed, and keep an index of open trips per rider. At 10x the request rate the 'read candidates, then mark busy' sequence is a race, so make it a conditional write per driver ('busy if still free') and retry with the next candidate, with a lock or a single-writer partition per zone. Positions arrive continuously: treat them as a stream into an in-memory index, not a database write each. A hot area (an airport at closing time) needs finer cells or its own shard. Quotes need idempotency keys so a retried request does not take two drivers.

## Level signals
- **SDE2:** the state machine written down and used consistently, a failed call that changes nothing, a driver freed on every path that ends a trip, the nearest driver chosen with a documented tie-break, the checks in the documented order.
- **Senior:** asks about distance, the pickup limit, tie-breaks and cancellation before coding; puts matching and pricing behind interfaces before being told they will change; stores the quoted fare; reads the market before the match changes it; explains why the decliner is remembered by the trip; names the zone lock.
- **Staff:** designs the geo index and the stale-read-then-conditional-write matching loop, splits pricing from matching from the trip service for stated reasons, makes every transition an idempotent versioned write, discusses surge as a feedback loop (it changes supply and demand, so it needs smoothing and caps), and separates 'quote' from 'book'.
