# Editorial: Elevator system

## Requirements
Functional: a bank of cars serving floors `0..F-1`; hall calls (floor and direction) and cabin buttons; time advances only with `step()`. Hidden until asked: a hall call is given to one car immediately, the one with the fewest floors to go from where it is now (ties to the lowest id); a car sweeps, meaning it keeps its heading while anything is ahead and reverses only when nothing is; arriving opens the doors on the same tick, they stay open one tick, and the car does not move on the closing tick; invalid floors, cars and impossible directions are refused without changing anything. Non-goals: weight limits, express cars, honouring the requested direction, a UI, persistence.

**Change Storm 1, cars out of service:** staff take a car out and bring it back. Taking it out stops it, drops its cabin stops, and gives its hall calls to the nearest cars still in service. New hall calls skip it, `selectFloor` on it returns `OutOfService`, the last car in service cannot be removed, and a returned car is idle where it stopped. Revealable by asking whether cars are ever unavailable or the dispatch rules will change.

## Reference design
- `StopList` holds the floors a car must visit, as cabin stops and hall stops, and answers "is anything ahead of me?".
- `Car` owns one elevator's floor, heading, stop list and current mode. It sweeps (`moveOneFloor` keeps the heading unless nothing is ahead) but knows nothing about other cars.
- `CarMode` (abstract) answers one thing: what happens to this car on a tick. `ActiveMode` serves a stop here or moves towards the next one, `DoorsOpenMode` closes the doors and does nothing else. Modes hold no data and are shared; the car holds the data.
- `Dispatcher` is the scheduling Strategy: given the cars that may take work and a floor, pick one. `NearestCarDispatcher` is the rule above.
- `Fleet` owns the cars and the dispatcher, hands the dispatcher only the cars in service, and moves hall calls between cars.
- `ElevatorSystemImpl` validates input and delegates. Keeping it thin avoids the god-class finding Senior Review raises at more than a dozen methods.
- Cabin stops and hall stops are kept separately in the `StopList` because they have different fates when a car is retired: passengers' choices die with the trip, hall calls must be handed on.

**Storm 1 in the reference:** one new class (`OutOfServiceMode`), two operations on a new `ServiceableElevators` interface, and `Fleet::takeOutOfService`. `ActiveMode`, `DoorsOpenMode` and `NearestCarDispatcher` are untouched, because the fleet only offers the dispatcher cars in service. The honest cost is that `Car::inService()` is derived from the mode pointer, and `takeOutOfService` must retire the car before re-dispatching (a test pins it).

## Alternatives
- **One class with `int floor`, a `bool doorsOpen` and a loop in `step()`** passes the first tests quickly and is what `bad/` shows. It is fine for a single car. With the storm it grows a second flag checked everywhere, and the dispatch rule is buried in `requestPickup`.
- **An enum of car states plus a `switch` in `step()`** is smaller than mode objects and reasonable for three states. It starts to hurt when states carry different behaviour for several operations (here only `step`, so be honest about it). Mode objects pay off at the fourth state or if `selectFloor` also differs by state.
- **Per-stop queue in request order (FIFO)** is the first idea most candidates have. It is simple and fair but makes cars crisscross the building; the sweep is the standard fix. It is also easy to show wrong with a two-line example, so be ready to argue it.
- **Assigning hall calls lazily** (keep a global pending list, assign when a car becomes free or passes the floor) gives better wait times than assigning at press time, at the price of a central queue and harder reasoning about who is coming. State that as the next step, not as a requirement.
- **Dispatch as a `std::function` or a template parameter** is lighter than an abstract class. An interface is better here because the policy will gain state (zones, load) and needs to be faked in tests.

## Trade-offs
Assigning at press time keeps each car's route simple and makes behaviour deterministic and testable, but a decision made on position alone can be poor a few ticks later (a car may be heading the wrong way). Distance-only dispatch is the simplest defensible policy; direction and load awareness are the first improvements, and the Strategy seam is where they would go. Returning a `Status` instead of throwing keeps every refusal visible at the call site and works in the browser toolchain; the cost is that a caller can ignore it. Dropping cabin stops when a car is retired is a simplification: a real car would finish its trip first.

## What breaks at 10x
At 10x the floors, the sweep gets expensive only if you scan all floors per tick; a sorted set of stops (as here) makes the next-stop lookup logarithmic. At 10x the cars, the dispatcher's linear scan per call is still fine, but the quality of the choice matters: nearest-car makes cars bunch up, so you need zoning or destination dispatch. At 10x the callers, a single mutex around the system is the first correct answer; beyond that an event loop with one writer. Failure handling also changes: a car that stops responding must be retired automatically and its hall calls reassigned, which is exactly the Storm 1 transition driven by a health check instead of a person.

## Level signals
- **SDE2:** correct movement, doors and validation; separates the car from the building; stops are kept as a set and served in order; tests for the edges (current floor, duplicate requests, top and bottom floors).
- **Senior:** asks how a car chooses its next stop and who answers a call before coding; sweeps instead of FIFO; models the car's stages explicitly; makes the dispatch rule replaceable; makes the storm additive and hands retired cars' work back; knows when an enum and a switch is enough.
- **Staff:** separates what changes (dispatch policy, availability, hardware faults) from what is stable (the per-car state machine); raises direction awareness, destination dispatch and fault detection before being asked; states what was deliberately left out.
