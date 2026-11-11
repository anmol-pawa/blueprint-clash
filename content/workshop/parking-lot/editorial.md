# Editorial: Parking lot

## Requirements
Functional: add spots (with a size), park a vehicle and get a ticket, leave with the ticket and get a receipt with the fee, count free spots per size. Hidden until asked: a fit rule (motorcycle in any spot, car in Medium or Large, truck in Large), best-fit allocation (smallest spot that fits, then lowest id), a plate cannot be inside twice, `LotFull` and `NoSuchTicket` change nothing, and a flat fee of 100 cents per started hour (minimum one hour). Non-goals: payment, floors, reservations, persistence, a real clock.

**Change Storm 1, vehicle pricing:** 50 / 100 / 200 cents per started hour for motorcycle / car / truck, and stays of 15 minutes or less are free. The rate follows the vehicle type, not the spot it landed in. It is revealable by asking whether pricing could differ by vehicle type or time of stay.

## Reference design
- `SpotInventory` owns the spots and which are taken, and picks the best fit. It is the only place occupancy changes.
- `TicketBook` owns the open stays (plate, vehicle, spot) and issues ticket ids.
- `FeePolicy` (abstract) answers "what does this stay cost?"; `HourlyFeePolicy(100)` is the base rule.
- `ParkingService` implements `park::ParkingLot`. It validates, then mutates: check the plate, find a spot, open the ticket; on leaving, close the ticket, free the spot, ask the policy.

**Storm 1 in the reference:** one new class, `RatedFeePolicy`, with a rate per vehicle and a grace period, selected by a new factory. `leave()`, `SpotInventory` and `TicketBook` are untouched, because the stay already remembers the vehicle type. The honest cost: the factory is new and `FeePolicy` receives the vehicle, which it already did for this reason.

Ownership: the service owns the inventory, the ticket book and a `unique_ptr<FeePolicy>`. No raw `new`, no shared state.

## Alternatives
- **One `ParkingLot` class with a spot map and a ticket map** passes the base tests in 20 minutes. It is where the bugs in `bad/` come from, and every storm becomes an edit of `leave()`. Good as a first pass you then split.
- **A `Spot` class hierarchy (`SmallSpot`, `LargeSpot`) with `canFit(Vehicle)`** looks object-oriented and pays off only if spots gain behaviour (EV charging, accessible bays). With only a size and an id, an enum and a comparison are clearer; say so, and name the point at which you would switch.
- **A `Vehicle` class hierarchy** (`Car : Vehicle`) is the classic over-modelling. The vehicle's behaviour here is two numbers (the smallest spot it needs and its rate), so an enum plus data wins. Subclassing starts to earn its keep when vehicles carry real behaviour.
- **`SpotAllocator` as a Strategy** (nearest to the entrance, fewest wasted sizes, random) is a legitimate second seam. It is not needed by the requirements as stated, so mention it and do not build it.

## Trade-offs
Best fit keeps large spots free for trucks, at the cost of a scan per arrival: O(spots) here, O(log n) with one ordered free-set per size. First fit is simpler, and it fails the "truck cannot find a large spot" case the moment cars have filled the large bays.

Pricing as a class costs one interface and one file; it buys the Open/Closed seam where the interviewer is most likely to push. A constant is correct if pricing never varies. Passing `minutesParked` into `leave()` instead of reading a clock keeps tests deterministic; the production version injects a `Clock` into the service and still hands the policy a duration, so pricing never learns about time sources.

Status codes instead of exceptions keep call sites explicit and work in the browser toolchain (no exception runtime). The cost is that a caller can ignore a result, which `[[nodiscard]]` on the status type would catch in a real codebase.

## What breaks at 10x
At 10x the spots (thousands) the best-fit scan becomes the first thing to index: one ordered set of free spot ids per size. At 10x the callers (several entry gates in parallel) the lack of locking is the issue: one mutex over inventory and tickets together is the correct first answer, with the follow-up on finer locks for after you have measured.

## Level signals
- **SDE2:** correct behaviour, a clear split between spots, tickets and fees, asks about vehicle fit and duplicate plates, and tests the edges (full lot, reused ticket).
- **Senior:** names the pricing seam before the storm, chooses best fit deliberately, validates before mutating, resists a vehicle class hierarchy and says why, and discusses concurrency unprompted.
- **Staff:** separates what will change (pricing, spot features) from what will not, ties allocation to the multi-lot and reservation future, and states what they deliberately did not build.
