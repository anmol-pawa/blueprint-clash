# Editorial: A brokerage with FIFO lots, commissions and corporate actions

## Requirements
Functional: accounts that hold cash (`openAccount`, `deposit`, `withdraw`), a market that publishes quotes (`setQuote`), market orders at the current quote (`buy`, `sell`) and two read calls (`statement`, `holding`). Then commissions (change storm 1) and splits and dividends (change storm 2).

Hidden in the brief and revealed by good questions: the legal ranges and the fixed check order (InvalidInput, then UnknownAccount, then the state), that a refused call changes nothing; that money is whole cents in 64 bits (one order can be 10^12 cents); that a never-quoted symbol is `NoQuote`; that a sale that cannot be filled in full is refused rather than shrunk; that sales use the OLDEST lot first and a part-used lot keeps the matching part of its cost; that realized profit moves only on a sale; and that portfolio value uses today's quote while cost basis is history.

**Change Storm 1, commissions:** `fee = max(minimum, flat + ceil(value x bps / 10000))` on every trade. The fee is part of what a buy cost and is taken out of what a sale pays, which makes a lot's cost something that is no longer a whole number per share, so the rule for the cost of part of a lot has to be written down (round down, the last shares take the rest). **Change Storm 2, corporate actions:** a split multiplies every lot's shares without touching cost or order, a dividend pays per share held now and never touches cost or profit.

## Reference design
Nine small classes, each with one reason to change.
- `Lot` is one purchase still held: shares and the cost of those shares. `take(count)` gives up shares and cost together, with the floor-then-remainder rule, so the cents always add up.
- `Position` is the lots of one symbol in purchase order. `sellFifo` is the only place that decides which shares go first.
- `Purse`, `Totals`, `Holdings` and `Account` split one customer's state into cash, running totals and positions, so no class is a bag of loose numbers.
- `Accounts` finds and opens accounts and owns the shared check order (bad id, then unknown id). `Rules` holds every legal range once.
- `QuoteBoard` knows the latest price of each symbol and nothing about accounts. `Commission` is the fee rule and nothing else.
- `TradeDesk` is the one place that moves cash, lots and totals together. Every check happens before the first write, so a refusal cannot leave a half-done trade. `Valuation` answers what an account is worth and is separate from how trades happen.
- `CorporateActions` is the only class that walks every holder.
- `BrokerageImpl` is a thin facade: validate, look the account up, delegate. It has exactly the interface's twelve methods and no rule of its own.

Why this shape passes the storms: the fee storm adds `Commission` and two calls in `TradeDesk` (and one total) and changes no existing class's meaning; the corporate-action storm adds `CorporateActions` and one `Position::split`. Nothing in `buy` or `sell` learns that splits exist.

## Alternatives
- **Average cost instead of lots:** one running (shares, cost) pair per symbol. Smaller and faster, and what many fund platforms report. The profit of a sale then no longer depends on which shares were sold, so it cannot answer tax-lot questions. A different `Position`, same interface.
- **LIFO, highest-cost-first or specific-lot selection:** the same lots with a different pick. Worth a `LotSelection` Strategy only when a second rule is really needed; one `if` today is cheaper to read than a hierarchy nobody uses.
- **Event-sourced accounts:** store only a journal of deposits, trades and actions, and derive cash and lots by replaying it. Great for audit and for recovery, more work to query; the natural production design (see the follow-ups), too heavy for the first 90 minutes.
- **Floating-point money:** simple and wrong. Use integers of the smallest unit, or a decimal type with a stated rounding rule.
- **Fees inside the quote (a spread) instead of an explicit commission:** how many retail platforms earn money. It removes the fee line but hides the cost from the ledger, so it was not asked for here.

## Trade-offs
- **Deque of lots per symbol vs an aggregate:** a deque costs memory per purchase and O(lots) to sum a position; the aggregate is O(1) but loses information. The reference sums on demand because positions have few lots; cache the totals in `Position` when that shows up in a profile.
- **Walking all accounts for a split or dividend vs a holders index:** the walk is trivially correct and costs O(accounts); the index is O(holders) and one more structure that must agree with the positions. Start with the walk, and keep it in one class so the swap is local.
- **Rounding the cost of a part-used lot down, remainder to the last shares:** loses nothing and never goes negative; the price is that the cost of one share in a lot can differ by a cent between sales. The alternative (exact fractions) is correct but heavy. The contested choice is _where_ the rounding error goes; the deciding factor is that the books must balance to the cent.
- **Refuse vs clamp:** a sale of more shares than held is refused, because a silent smaller trade is a different trade. The cost is one more round trip for a caller who really did want 'everything'; give that caller a `holding()` read first.
- **Validate in the facade, check state in the desk:** keeps `Rules` and the check order testable in one place; the cost is that the desk assumes valid arguments, so it is internal.

## What breaks at 10x
- **Many more accounts and symbols:** an `std::map` per account and a walk for every action is fine until a split must touch millions of accounts. Add the holders index, and run the action as a batch of independent, idempotent per-account jobs.
- **Many threads:** the design is single-threaded on purpose. Per-account serialisation is easy; the cross-account operations (actions, transfers) need a cut-off or a fixed lock order. Shard by account id so a trade is a single-partition transaction.
- **Many more quotes per second:** `setQuote` is a hash write, but every `portfolioValue` walks the positions. Cache a valuation per account and invalidate it on trade and on a quote change for a held symbol, or compute valuations lazily at the edge.
- **Long-lived accounts:** the number of lots grows. Compact lots only through the same rules (a sold-out lot disappears already); never merge lots that cost different amounts, it changes future profit.
- **Failure between writes:** in memory a trade cannot half-happen; across a database it can. Journal the trade as one record, derive the rest, and make retries idempotent.

## Level signals
- **SDE II:** gets the cash and the lots right, uses 64-bit cents, makes a refused call change nothing, and passes FIFO profit including a partly consumed lot. May need a hint for the check order and for the rounding rule once fees arrive.
- **Senior:** separates lots, positions, the trade desk, quotes and valuation without being asked; keeps every check before the first write; handles the fee storm by adding a fee rule rather than editing the trade code in several places; writes the rounding rule down and shows the books add up. Names the corporate-action walk as a cost.
- **Staff:** frames cash and lots as derived from an append-only journal, brings idempotency keys, reconciliation against a custodian and invariants that run in production, and discusses ex-dividend cut-offs and per-account sharding as the real concurrency problems. Explains why FIFO versus average cost is a product and tax decision, not a technical one.
