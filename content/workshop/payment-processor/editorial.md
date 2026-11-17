# Editorial: Payment processor with retries and idempotency keys

## Requirements
Functional: charge a card through a remote gateway for an amount in whole cents; record approved payments with an id; make every call safe to repeat; retry what is worth retrying; refund; forget keys after a while.

Hidden in the brief and revealed by good questions: a request is a key, a card and an amount, and validation comes first and records nothing; the same key with the same request is a repeat and returns the earlier answer without calling the gateway; the same key with a different request is a conflict; approved and declined are both final answers and are replayed; only a temporary error is retried (at most 3 calls, same key every time); a request that never got an answer (GaveUp) is not recorded and leaves the key free.

**Change Storm 1, refunds:** `refund(key, id, amount)` with partial refunds, a cap on the total, the same replay and retry rules, and one key namespace for payments and refunds. A repeat is replayed even when the cap has been reached since.

**Change Storm 2, expiry:** `makeExpiringProcessor(gateway, clock, ttl)`: an answer is remembered for exactly `ttl` seconds from when it was recorded; replays do not extend it; an expired key behaves as if it was never used.

## Reference design
- `ProcessorImpl` is the facade. It validates in the documented order, asks the key book whether this is a repeat, calls the gateway through the retry policy and records the outcome. It holds no rule about what "the same request" means or how many attempts are allowed.
- `RequestShape` is a value: kind, target (card for a payment, payment id for a refund) and amount, compared in one place. It is what turns a reused key on a different purchase into a loud `KeyConflict`.
- `KeyBook` remembers the final answer to every request by key, for payments and refunds alike, and answers one question: fresh, replay or conflict.
- `Lifetime` is the Strategy for how long an answer counts: `NoExpiry` and `TtlLifetime`. The key book never reads a clock; it asks the lifetime for a stamp when it records and whether a stamp has expired when it looks.
- `Retrier` repeats a call while the gateway says "temporary", at most `kMaxAttempts` calls. It knows nothing about payments, keys or ledgers.
- `PaymentLedger` records approved payments, issues ids and totals the refunds of each.
- `ChargeOnlyGateway` is an Adapter so the processor talks to one gateway type: a plain `Gateway` is wrapped so that any refund is declined.

**Storm 1 in the reference:** `ProcessorImpl::refund` is new and `PaymentLedger` gains a refunded total per payment. The key book, the retrier and the fingerprint are reused unchanged, because they were never specific to payments. That is what the storm tests.

**Storm 2 in the reference:** `TtlLifetime` and one factory are new. `KeyBook` already asked a `Lifetime` instead of reading time, so nothing in the facade changes.

## Alternatives
- **Remember only approvals.** Simple, and wrong: a declined request goes back to the gateway on a repeat and may be approved the second time, against what the customer was told.
- **Remember every outcome, GaveUp included.** The caller's own retry then replays the failure forever. "We do not know" must leave the key free.
- **Key only, no request shape.** The first draft of most candidates. It treats a client bug (one key for two purchases) as a successful replay. Comparing the shape costs one small value type.
- **A different key per retry at the gateway.** Looks tidy and defeats the point: a timeout may arrive after the gateway took the money, and only the same key makes the repeat safe.
- **Retry loops inside `pay()` and again inside `refund()`.** Two copies drift. The usual drift is a different attempt count.
- **Subclass per operation (`PayHandler`, `RefundHandler`) with a base class that does the replay.** Fine if the base owns the key logic once; a hierarchy that copies it is worse than two methods.
- **Idempotency in a database unique constraint on the key.** The right production answer for concurrency; the in-memory model here shows the rules it must enforce (shape, answer, lifetime). Say both.
- **Floating point for amounts.** Whole cents in a 64-bit integer. Never floats for money.

## Trade-offs
Replaying a decline saves a gateway call and gives the customer one consistent answer, at the cost that a card that is topped up a minute later still sees the old decline until the key is new. Callers are told to use a new key for a new attempt after a decline; the docs of any idempotent API say so.

Retrying at once is the simplest correct rule and is wrong for production: synchronized retries turn a gateway blip into an outage. Real systems wait with exponential backoff and jitter, under a deadline and a retry budget; the `Retrier` is the one class that changes.

Expiry bounds storage and costs correctness at the edge: a very late repeat is processed as a new request, which for a refund means money moves twice. Pick the window longer than any sane client retry and give high-value operations a second, permanent guard (a business-level unique constraint).

The key book holds the whole record in memory. Production keeps it in a consistent store with a TTL and claims the key before calling the gateway.

## What breaks at 10x
The in-memory key book is one map and one process: at ten times the load it is the first thing that needs to be a store. The hazard is not speed but concurrency: two requests with one key arriving together both see "fresh" and both charge. The fix is an atomic claim of the key (conditional insert with the request shape and an "in progress" marker), with a timeout so a crashed worker does not block the key forever, and a defined response for the loser (wait, or "in progress, retry"). Retries amplify load exactly when the gateway is slow, so cap them with a budget and add a circuit breaker. The ledger needs a per-payment lock or a conditional write on the refunded total so concurrent refunds cannot jointly exceed the payment. Reconcile with the gateway's settlement report: the processor and the gateway can disagree after a crash between the gateway call and the record.

## Level signals
- **SDE2:** validates first, retries only temporary errors with a bounded count, keeps the same key on every attempt, replays a repeated request without calling the gateway, and refuses a reused key for a different request.
- **Senior:** separates the key book, the retry policy and the ledger with one reason to change each; records final answers only and says why GaveUp is not one; writes "same request" once as a value; reuses the same machinery for refunds without copying; names the concurrent-claim hazard and the timeout-after-charge hazard.
- **Staff:** treats the payment as a persisted state machine so a crashed worker can resume; sends keys downstream and reconciles with settlement files; designs retry budgets, jittered backoff, circuit breakers and gateway failover; explains what expiry costs and adds a permanent business-level guard for refunds; says which anomalies page a human.
