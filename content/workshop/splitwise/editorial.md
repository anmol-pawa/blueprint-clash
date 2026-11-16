# Editorial: Expense sharing

## Requirements
Functional: `addMember(id)` builds the group; `addExpense(payer, cents, participants)` shares an amount equally in whole cents (each owes `cents / n` rounded down, and the `cents % n` leftover cents go one each to the first participants in the order listed; the payer need not take part and their own share is not a debt); `settle(from, to, cents)` records a payment; `balance(member)` and `debts()` report where the group stands. Refusals come first, in a fixed order, and change nothing. `debts()` is pairwise: opposite directions between two people are netted, a pair that cancels is omitted, the list is sorted by debtor then creditor. Hidden until asked: the rounding rule and who gets the odd cent, that the payer owes themselves nothing, the netting of opposite debts, the direction flip when someone overpays, and the order of the refusals. Non-goals: threads, exceptions (compiled without them), currencies, history and undo, persistence.

**Change Storm 1, richer splits:** `makeSplittingLedger`: `addExpenseSplit(payer, cents, SplitSpec)` with `Exact` (cents per member, each at least zero, summing to the bill), `Percent` (basis points summing to exactly 10000) and `Shares` (positive integer weights). Proportional kinds round down and give the leftover cents one each to the largest rounded-away fractions, ties to the member listed first; `Equal` is the same rule with all weights 1. `BadSplit` is the last check. Revealable by asking whether 50/50 is the only way to share a bill.

**Change Storm 2, simplified debts:** `makeSimplifyingLedger`: `simplify()` returns payments that bring every balance to zero, working from balances only and without changing the ledger. The rule is exact so the answer can be tested: the biggest debtor (ties: smaller id) pays the biggest creditor (ties: smaller id) the smaller of the two amounts, repeated. Revealable by asking whether the app can say how to settle with few payments.

## Reference design
- `PairLedger` is the one source of truth about money: the net amount one member owes another, keyed by the unordered pair with the direction in the sign. `balance`, `balances` and `debts` are read-only views of it, so they cannot disagree, and "all balances add up to zero" follows from how an entry is recorded: one side plus, the other minus.
- `MemberBook` owns who is in the group and the rule for adding a person.
- `LedgerImpl` is the facade: it validates in the documented order, asks the split rule for the shares, books each share as one debt to the payer and answers the queries. It has no rule of its own about rounding, kinds of split or simplification.
- `SplitRule` is the Strategy for "how is an amount divided": `accepts` (are these numbers valid for this kind and amount) and `shares`. `EqualSplit`, `ExactSplit`, `PercentSplit` and `SharesSplit` implement it; `SplitRules` finds the right one without a type switch.
- `Apportioner` owns the rounding: divide in proportion to weights, round down, hand the leftover cents to the largest fractions, ties to the earlier position. Equal, percent and shares all use it, so the odd cent is decided in exactly one place.
- `DebtSimplifier` turns balances into payments with the documented greedy. It never touches the books.

**Storm 1 in the reference:** one class per new kind (`ExactSplit`, `PercentSplit`, `SharesSplit`), one registration line each, and `Apportioner` extracted so that Equal and the new proportional kinds round identically. The facade gains `addExpenseSplit`, and `addExpense` becomes a call to it with an Equal spec, so there is still one booking path. Be honest about what a candidate who put the equal split inline must change: the booking method, the rounding and every test of it.

**Storm 2 in the reference:** one new class, `DebtSimplifier`, and a one-line `simplify()` in the facade that gives it `balances()`. The books, the split rules and the rounding are untouched, because balances were already a derived view.

## Alternatives
- **Balances stored per member only, no pair ledger.** The balance is O(1) and simplification is trivial, but `debts()` cannot be answered: the information about who owes whom is gone. Choose it only if the product never shows pairs.
- **Directed debts kept separately** (one entry per expense or per direction). Simpler to write, but netting is then a read-time job and a sign bug is easy to make. A single signed amount per unordered pair makes netting automatic.
- **Floating-point money.** Short to write and wrong: shares drift and the balances stop adding up. Integer cents with a stated rounding rule are exact.
- **Leftover to the payer, or to a random member.** Systematically unfair for repeated dinners (payer), or untestable and non-reproducible (random). Largest remainder keeps every share within one cent of its true value.
- **An enum plus a switch in the facade** for the kinds of split. Fine for two kinds, and every new kind edits the code that books money. A Strategy with one class per kind costs a small interface and makes the fifth kind as cheap as the second.
- **Exact minimum number of payments.** NP-hard in general (it contains subset-sum); exact search is fine for six people and hopeless for sixty. The greedy is explainable and bounded by the number of people minus one.
- **An append-only entry log** instead of mutable pair totals. Strictly better for audit and undo, at the price of replay or snapshots; it is the follow-up, not the first version.

## Trade-offs
Pair totals versus a log: the totals are four lines and O(pairs) to read, and cannot explain themselves; the log explains every balance and supports edits, and costs storage and a projection. For a friend group the totals are enough; for a product with disputes you want the log. Greedy versus minimal simplification: a stable, explainable plan within people - 1 payments against an optimum that is NP-hard and often gives a plan nobody can follow. The deciding factor is what the group will actually do with the answer.

## What breaks at 10x
At ten times the members (hundreds), the pair map is quadratic in the worst case and `balance()` scans all pairs: keep a per-member balance map updated in the same method that changes a pair, and a per-member adjacency index for `debts()` filtered by member. The greedy is O(n log n) with heaps instead of repeated `max_element`. At ten times the traffic the group is still the unit of locking, so shard by group id and serialise per group. The real hazards are not speed but rounding (a proportional split multiplies the bill by up to 10000, so use 64-bit arithmetic and check the range) and offline clients (merge idempotent entries with client ids and store the listed order, since the extra-cent rule depends on it).

## Level signals
- **SDE II:** equal split with integer cents, the remainder handled deterministically, a pairwise debt view with netting, working settle. Names a rule for the odd cent when asked.
- **Senior:** one source of truth for the money state, the checks in a fixed order, a Strategy for the split kinds added without editing the booking code, a single rounding class shared by all kinds, and honest notes that the greedy is not minimal.
- **Staff:** talks about the log and projection model, offline merge with idempotent entries, the NP-hardness of minimising payments and what the product actually wants instead, overflow in proportional maths, and how the rounding rule interacts with replication.
