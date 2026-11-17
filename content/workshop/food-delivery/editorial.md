# Editorial: Food delivery

## Requirements
Functional: restaurants with menus; a customer orders items and is quoted the total (food plus a flat 299 delivery fee) up front; an **order state machine**, Placed, Accepted, Ready, PickedUp, Delivered, with Rejected and Cancelled as the other ends; the restaurant answers and finishes the food, the assigned courier collects and hands over, and every call checks UnknownOrder, then WrongParty, then InvalidState. A ready order goes to the **free courier with the lowest name**, or waits and is given to the next courier who becomes free, oldest order first. The customer can cancel until a courier has the food: free while Placed, 25 percent of the food while Accepted, the whole food once Ready, never the delivery fee. Anyone can **subscribe** to see every change of state. Hidden until asked: the dispatch and tie-break rules, the queue order, what cancelling costs and when, what exactly is announced. Non-goals: payment, geography, ETAs, ratings, persistence, thread safety (discussed).

**Change Storm 1, promo codes:** `makePromoFood(codes)` and `placeWithCode`. A percentage or a fixed amount comes off the food only, with a minimum order; the code's checks have their own order; the cancellation fee is charged on the discounted food. Revealable by asking whether customers will be able to use discount codes.

**Change Storm 2, kitchen capacity:** `makeBusyKitchens(codes, slots)`. An order holds one of a kitchen's cooking places from Accepted until it leaves Accepted, and `accept` on a full kitchen is `KitchenFull`. Revealable by asking whether a kitchen can take unlimited orders.

## Reference design
- `Menu` is what each restaurant sells; it knows nothing about orders.
- `OrderDesk` validates a request in the documented order, prices it (applying a code when there is one) and records the order.
- `OrderBook` keeps every order, owns the **table of legal moves** (`OrderLifecycle`) and is the one place a state changes (`move`), where it tells the listeners: the Observer subject.
- `CourierPool` knows who is free and holds the queue of ready orders without a courier. It records an assignment on the order but never changes its state.
- `CancellationFee` is a Strategy (`StageFee`) from the stage and the food to what the customer owes.
- `FoodImpl` is a thin facade: ask the book whether the move is legal, make it, tell the collaborator that cares.

The central decision is that **each thing that changes for a business reason has its own home**: what a cancellation costs (`CancellationFee`), which moves are legal (`OrderLifecycle`), who gets a ready order (`CourierPool`), and who needs to hear about it (listeners on `OrderBook`). The two storms then land in one place each.

**Storm 1 in the reference:** `PromoBook` and `Discount` (`PercentOff`, `AmountOff`) are new classes; `OrderDesk` applies the discount to the food before adding the delivery fee and stores the discounted food on the order, so the existing fee strategy needs no change at all. **Storm 2 in the reference:** `KitchenLoad` is a new class that subscribes to the book and counts orders entering and leaving Accepted; `accept` gains one line asking it for room, after the shared checks. The honest cost is that the load has to see every event: it is correct only because `OrderBook::move` is the only way a state changes.

## Alternatives
- **An `if` chain on the state in each operation.** Quicker for the base game, and every new operation then has its own idea of what is legal. A table in one place makes a wrong move a one-row diff.
- **A State class per stage.** The textbook shape, and worth it when each stage has behaviour of its own (a timer, a message, a different fee). Here the stages differ in which moves are allowed and in one fee, so the table plus a fee Strategy is smaller and as clear; this editorial would choose State objects the day Ready orders need a no-courier timer.
- **Courier assignment as a field scan:** loop over all orders to find the oldest unassigned one whenever a courier frees up. Correct and quadratic; the queue costs a `set`. It also hides the rule: the queue shows in one place that 'oldest' means lowest id.
- **Notifications called directly from each operation** (`notifier.send(...)` after each move). Three call sites become eight, and cancel is the one that gets forgotten. The Observer funnel is the same code written once.
- **A counter for kitchen load updated in `accept` and `ready`.** Passes Storm 2's happy path and fails the first time an order leaves Accepted another way (cancel). Deriving the count from the transitions is what makes the exits impossible to miss.

## Trade-offs
- **Table of moves versus State objects:** small and testable versus room to grow behaviour per stage.
- **Observer versus direct calls:** a callback is easy to add and easy to make slow; synchronous listeners run inside the transition, so a throwing or blocking listener hurts the order flow. Production moves to an event log (see follow-ups).
- **Fee on discounted food:** the customer never pays more in fees than the food cost; the cost is that the order must remember the discounted food, not just the total.
- **Lowest-name courier:** deterministic and testable, but not fair or smart. It is a placeholder for the real rule (distance, ETA, load), which is one class.

## What breaks at 10x
At ten times the volume the scans hurt first: `CourierPool::orderReady` walks every courier, and `OrderBook::find` is fine but the courier queue is global. Split dispatch per city, keep free couriers in an ordered set, and keep the waiting orders in a heap by id. The single-threaded listeners would be the next thing to fail: publish events after the transition, to a queue.

## Level signals
- **SDE II:** a correct state machine with the party and state checks in the right order, the courier queue working in the happy path, fees by stage, and the observer feed. Storm 1 done by adding a parameter.
- **Senior:** the table of moves and the single funnel for state changes, couriers and their queue behind their own class, the fee as a Strategy, the discount applied before the delivery fee, kitchen load derived from transitions. Both storms land in one class each.
- **Staff:** names the invariants (one courier one order, every exit from Accepted frees a place), says which need a lock or a conditional write, and sketches the move to an event log with consumers, a dispatch service and idempotent transitions, with the saga costs stated.
