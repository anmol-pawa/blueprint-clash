# Editorial: Car rental

## Requirements
Functional: car categories with a price per started day, individual cars with plates, and a clock-driven lifecycle: a customer **reserves** a category for a period, **picks up** a real car, and **returns** it. Reserving promises one car for the whole period or nothing and returns an id and the total. Cancelling is possible until the car is collected. Time arrives through an injected `Clock` as a whole number of hours. A rental is the half-open range of hours `[pickup, dropoff)`, one to 720 hours, and costs the daily rate times `ceil(hours / 24)`. Checks run in a fixed order for every operation (documented in `api.h`). Hidden until asked: whether the drop-off hour is held, whether sequential rentals "add up", what pickup does when the cars are late, and what an early or late return does. Non-goals: payment, insurance, maintenance, branches, thread safety (discussed), persistence.

**Change Storm 1, late fees:** `makeLateFeeRentals(clock, grace, percent)`. After the grace hours, each late hour costs a percentage of the category's daily rate, added to the total, rounded down once. Revealable by asking what happens when cars come back late.

**Change Storm 2, rotation:** `makeRotatingRentals(clock, grace, percent)` hands out the car that has been idle longest; never-rented cars first; ties go to the lower plate. Revealable by asking whether it matters which free car is handed out.

## Reference design
- `TimeSpan` is the half-open range of hours: validity, overlap, early ending and the started-day count. It knows nothing about cars or money.
- `Schedule` is the promises: reservation id, category and span. Its one question is the busiest hour of a span, answered by an event sweep (ends before starts at the same hour).
- `Fleet` is the physical cars: category, out or not, and when each last came back.
- `Bookings` issues ids and keeps customer, category, span, total and the plate once collected. A removed record looks never issued.
- `Tariff` knows what each category costs and prices a span.
- `LateFee` is a Strategy (`NoLateFee`, `GraceThenPercent`) and `CarChooser` is a Strategy (`LowestPlate`, `LongestIdle`).
- `RentalsImpl` is the facade: it validates in the documented order and sequences the collaborators. It holds no rule of its own about hours, prices, fees or which car goes out.

The central decision is the split between **promises** (`Schedule`, counts) and **cars** (`Fleet`, plates). They can disagree for a while, and the design says so openly: a late car makes `pickUp` fail with `NoCarReady` even though the reservation was valid.

**Storm 1 in the reference:** `GraceThenPercent` is a new class; `returnCar` asks `LateFee::extra` and adds it. No existing class changes behaviour. **Storm 2 in the reference:** `LongestIdle` is a new class. The fleet already records when each car came back, which is the one thing Storm 2 needs; the honest cost is that `Fleet` was built for it in advance, and the editorial would be lying if it said it was a surprise for a design that only tracked "out or not".

## Alternatives
- **Assign a car at reservation time** (a list of intervals per car, first-fit). It feels natural and is a trap: online first-fit interval assignment can refuse a request that a count-based check accepts, because earlier choices fragment the cars. Keeping the promise as a count and assigning at the counter avoids the problem, at the price of the late-car failure above.
- **Count overlapping reservations** is the first thing most candidates write. It answers "how many reservations touch this range" and rejects sequential bookings that never needed two cars at once. The busiest hour is the right question.
- **An array of hours** works for a fixed horizon. The sweep over the relevant reservations needs no horizon and costs O(reservations in the category) per request, which is fine here and is the first thing to index at scale.
- **A State pattern per reservation** (Reserved, PickedUp, Returned, Cancelled) is the textbook shape. The only states here are "promise exists", "car collected" and "spent", so a record with a plate and an erase on completion is enough; real states would pay for themselves with inspections, damage and disputes, which are in the follow-ups.
- **A cron job that releases no-shows** looks tempting. Deriving "lapsed" from the clock and the span needs no timer, no thread and no stale state.
- **Maintenance, branches, one-way rentals** each break the "interchangeable cars" assumption. Saying which class changes for each is stronger than building any of them.

## Trade-offs
Counting per category keeps reserving honest about what was promised and cheap to reason about; it gives up the ability to promise a particular car. Splitting `Schedule` from `Fleet` makes the late-return failure visible instead of hiding it in one class that tries to be consistent about both. Putting the fee and the car choice behind Strategies costs two small interfaces now and makes both storms additive. Computing everything from the injected clock costs a parameter on a few calls and removes timers entirely.

## What breaks at 10x
At 10x the cars, nothing changes: categories are independent, so shard by branch and category. At 10x the traffic on one category, the per-category lock is the hot spot and the O(reservations) sweep per request starts to matter: keep the schedule as per-hour counters or an interval tree, and serve search from a stale read model. Lapsed no-shows accumulate forever in this in-memory version and need a sweeper. Reserving needs an idempotency key before retries are safe.

## Level signals
- **SDE2:** the half-open range stated and used consistently, started days computed correctly, a failed reserve that changes nothing, a cancel that frees only its own slot and spends the id, checks in the documented order.
- **Senior:** asks about the drop-off hour, sequential rentals and late cars before coding; separates promises from physical cars and says what can disagree; keeps span, schedule, fleet, bookings and tariff as small classes; makes the fee and the car choice Strategies when the change arrives; names the lock per category.
- **Staff:** explains why per-car first-fit assignment is a trap, treats maintenance and branches as changes of the interchangeability assumption, moves correctness into a conditional write in a shared store with idempotency, separates search from reservation, and quantifies overbooking against no-shows.
