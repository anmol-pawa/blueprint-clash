# Editorial: An order book with price-time priority, time in force and amends

## Requirements
Functional: a `Book` for one instrument that accepts limit orders (`submit`), cancels resting ones (`cancel`) and answers `remaining`, `bestBid`, `bestAsk`, `depthAt`, `restingCount`. Then time in force (immediate-or-cancel, fill-or-kill) and then `amend`.

Hidden in the brief and revealed by good questions: the ranges (ids from 1, prices and quantities with both ends inclusive) and the check order (InvalidOrder before DuplicateId; a refusal changes nothing, not even the caller's vector); that an id is spent forever by any accepted order; that a trade happens at the WAITING order's price; best price first (lowest sell, highest buy) then earliest arrival; that the remainder rests at its own limit and a partly filled order keeps its place; that cancel needs a resting order and leaves the others in place; and that the top of book is the total at the best price.

**Change Storm 1, time in force:** Ioc never rests; Fok trades everything or leaves the book untouched, so it needs a question the book can answer without changing. **Change Storm 2, amend:** the same price with a smaller or equal size keeps the place; anything else is a new arrival with the old id that trades at once if it crosses.

## Reference design
Seven small classes, each with one reason to change.

- **`Order`:** id, side, price and what is still unfilled. Only the unfilled quantity changes.
- **`HalfBook`:** one side as an ordered map from price to a `std::list` queue, with the best price always first (sells are keyed by price, buys by its negation, so `begin()` is the best on both sides). It can add, remove by position, sum a level, and answer `availableFor(limit)` as a pure query. It knows nothing about trading.
- **`RestingIndex` and `IdLedger`:** the first maps an id to its side, price and list position so cancel, amend and `remaining` are O(1) lookups; the second is the set of every id ever accepted. They answer different questions ('where is it?' versus 'was it ever used?'), which is why a filled order is in the ledger and not in the index.
- **`Matcher`:** the one rule of the market. While the taker has quantity and the best opposite price is acceptable, trade with the oldest order at that price, at its price, and retire a maker that is fully filled. `available(order)` is the read-only twin used by fill-or-kill.
- **`Disposition` (Strategy):** `GoodTillCancelled`, `ImmediateOrCancel`, `FillOrKill` each answer two small questions: may this order start trading, and does the remainder rest? The enum maps to an object in one place.
- **`OrderRules`:** the ranges, in one class.
- **`BookImpl` (Facade):** validates, records the id, and sends the order down one private path, `enter`, that previews, matches and rests. An amend that loses its place calls `enter` as well, so a crossing amend trades exactly like a new order.

The storms edited nothing that existed: storm 1 added two small classes and a map entry, storm 2 added one method that reuses `enter`.

## Alternatives
- **Sorted vector of levels (or a dense array indexed by tick):** faster for the real hot path (see 10x), simpler to reason about for a small tick range, but O(L) inserts as a vector and a memory cost as an array. The map is the right interview default; naming the array is a senior signal.
- **One map for both sides with a comparator flag:** shorter, but every use then has to remember which direction 'best' means. Two `HalfBook` objects make the direction a property of the object, and the matcher never branches on it.
- **A priority queue of orders:** gives best price but not FIFO within a price unless every order carries a sequence number, and cancelling from the middle needs lazy deletion. It works (heap + sequence + tombstones) and is a common first draft; the ordered map is cleaner when cancels are frequent.
- **Time in force as flags and `if`s in `submit`:** the shortest first draft and the one the storm punishes: every new kind edits the same function. Small policy classes put each rule in one place.
- **Amend as 'cancel then submit' by the caller:** simple, but it loses atomicity (another order can arrive between the two calls) and the in-place reduction cannot be expressed. The book must own the amend.

## Trade-offs
- **Ordered map versus arrays.** `std::map<int, std::list<Order>>` allocates per order and per level and chases pointers. It is easy to get right and fast enough for an interview, and the wrong choice for a production engine with a microsecond budget.
- **Keeping the book honest on refusals.** Every check happens before the first change, so a refused call leaves nothing behind. That is why `fills.clear()` comes after the validation and why a refused amend does not touch the caller's vector.
- **Preview then commit versus rollback.** Fok asks a pure question first. It costs a second walk over the levels, and it is the only design where an observer never sees a half-trade.
- **One class with many methods versus a facade over parts.** The facade has nine methods and no rule of its own. The cost is that the parts hand data to each other through small interfaces; the gain is that each of them is tested by the same random model without caring which one broke.
- **Statuses instead of exceptions.** The judge builds without exceptions and the caller meets refusals in normal use, so a documented check order is a better contract.

## What breaks at 10x
- **Throughput:** the map and list allocate on every order. Use an arena of orders addressed by index, a dense array of price levels with a bitmap to find the best one, and an intrusive queue per level. Pin one thread to the instrument.
- **Many instruments:** one book per instrument, sharded by symbol across threads; the books share nothing. Cross-instrument risk checks go in front of the book, not inside it.
- **Recovery:** the book is a function of an input log. Persist and sequence the log, snapshot periodically, replay the tail, and let a standby follow the same log.
- **Fairness and audit:** assign a sequence number to every event; time priority is then exactly 'lower sequence first' and can be proved from the log.
- **More order types:** market orders are Ioc with an extreme price; stops wait outside the book and enter through `enter`; icebergs make queue entries refreshable. None of them changes `Matcher`.

## Level signals
- **SDE II:** a working book: a map per side, a queue per price, best price first, trades at the resting price, cancel by scanning if needed. Passes the base tests; matching probably lives inside the book class.
- **Senior:** one place for the matching rule, a side that hides which direction is 'best', an id index for O(1) cancel, a separate ledger for used ids, fill-or-kill decided by a pure preview, time in force as small policies, and an amend that reuses the entry path. States when the priority rule is fair and why reducing keeps the place.
- **Staff:** talks about the sequenced input log, deterministic replay and failover before being asked, the arena and tick-array layout for the hot path, the model-based test with invariants, risk checks in front of the book, and what to freeze in the contract (check order, fill shape, id rule).
