# Editorial: Vending machine

## Requirements
Functional: set up slots (id, name, price, quantity) and restock them, accept coins, dispense on selection with change, cancel for a refund. Hidden until asked: only 5/10/25/100 cent coins, a button press with no credit says `InsertCoinFirst`, a selection is checked as unknown slot, then sold out, then insufficient funds, and any refusal changes nothing (the customer keeps the credit). Non-goals: limited change inventory, card payments, UI, persistence.

**Change Storm 1, maintenance mode:** a technician enters maintenance (credit is refunded), coins and selections return `OutOfService` (which beats `InsertCoinFirst`), cancel returns 0, stocking still works, and leaving returns to normal service. Leaving when not in maintenance must not disturb a customer's credit. It is revealable by asking whether the machine is ever out of service or has other modes.

## Reference design
- `SlotCatalog` owns the slots, prices and quantities and validates additions and restocks.
- `Till` owns the credit and knows which coins are valid; it can refund everything or take a price and refund the change.
- `MachineState` (abstract) answers the three customer operations: `insertCoin`, `select`, `cancel`. `IdleState` and `HasCreditState` implement the base rules. States are stateless and shared; the data lives in the machine and they reach it through a small `MachineContext` interface.
- `MachineCore` holds the data and the current state and implements the transitions (`becomeIdle`, `becomeHasCredit`, `becomeMaintenance`). `VendingMachineImpl` implements the public interface and delegates each customer operation to the current state. Splitting them keeps the public class thin (Senior Review flags a class with more than 12 methods).
- Every `select` validates first and mutates last, so a refusal returns before touching the catalog or the till.

**Storm 1 in the reference:** one new class, `MaintenanceState`, one new transition, and three operations on a new `ServiceableMachine` interface. `IdleState`, `HasCreditState`, `SlotCatalog` and `Till` are untouched. The honest cost: the context interface gained `becomeMaintenance()`, and `enterMaintenance()` has to remember to refund before switching (it does, and a test pins it).

## Alternatives
- **One class with an `int credit_` and a handful of `if`s** passes the base tests in ten minutes, and it is what `bad/` shows. It is fine for the base problem. The storm turns it into a boolean flag checked in every operation, and the bugs in `maintenance_still_sells` and `maintenance_keeps_credit` are the predictable result.
- **An enum plus a `switch` in each operation** is smaller than the class-per-state version and perfectly reasonable for two or three states. Its weakness is that a new state is an edit in every operation, and a missed case is a silent bug (turn on `-Wswitch` and keep the `default:` out). Say so, and say where you would switch to State objects: the third state, or states that carry their own data.
- **A transition table** (state × event → state + action) is the right shape once you have many states or want to render the diagram, test reachability or load the rules from data. For this size it hides the behaviour behind indirection.
- **Stateful state objects** (a `HasCreditState` that stores the credit) allocate on every transition and make the credit hard to reach from other states; keeping the data in the machine and the states stateless avoids both.

## Trade-offs
State objects put all behaviour of a stage in one class and make a new stage additive, at the price of more files and an interface the states use to reach back into the machine. That is a win when the stages differ in behaviour for most operations (they do here) and a loss when only one operation differs.

Refusals returning a status instead of throwing keeps every path visible at the call site and works in the browser toolchain (no exception runtime). The cost is that a caller can ignore a result; `[[nodiscard]]` on `Status` would catch that in a real codebase. Returning change as one number is a deliberate simplification: a real machine returns coins, which needs a coin inventory and a change-making rule (see the follow-ups).

## What breaks at 10x
At 10x the slots, nothing: a map lookup per press. At 10x the machines (a fleet), the interesting problems are outside this class: price and stock updates arriving while a customer is mid-purchase, telemetry, idempotent settlement for card payments, and recovering a machine that rebooted holding someone's coins. At 10x the concurrency (coin acceptor and keypad on separate threads), one mutex around the facade is the first correct answer, since the invariant spans credit, stock and current state.

## Level signals
- **SDE2:** correct behaviour for the happy path and the refusals, a clear split between slots, money and flow, and tests for the edges (sold out, overpayment, cancel, second customer).
- **Senior:** asks about no-credit presses and refusal semantics unprompted, models the stages explicitly, validates before mutating, makes the storm additive, refunds before switching modes, and knows when an enum and a switch is enough.
- **Staff:** separates what changes (payment methods, modes, pricing) from what is stable, raises exact change and fleet concerns before being asked, and states what they chose not to build.
