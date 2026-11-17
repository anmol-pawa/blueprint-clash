# Editorial: ATM (cash machine)

## Requirements
Functional: a card goes in (`insertCard`), the customer proves who they are (`enterPin`), asks for cash (`withdraw`), and the card comes out (`ejectCard`). The machine is always in one of four states: Idle, AwaitingPin, Ready, or OutOfService (idle with no notes at all). Every operation an inappropriate state does not allow answers `WrongState` and changes nothing. Three wrong PINs in a row retain the card; the count belongs to the card and survives ejecting and re-inserting. A withdrawal checks, in order, the amount (`InvalidAmount`), the account (`InsufficientFunds`) and the notes (`CannotDispense`), is all-or-nothing, and debits the bank exactly once. Notes are chosen greedily, largest denomination first, limited by the stock.

**Change Storm 1, pay whenever possible:** `makeFlexibleAtm` pays any amount some combination of the held notes can make, with the fewest notes, and among equally short combinations with more of the larger denomination. 60 from one 50 and three 20s used to be refused and is now three 20s.

**Change Storm 2, daily limits:** `makeLimitedAtm(bank, stock, dailyLimit)`: each card may withdraw `dailyLimit` in total per day across sessions, checked between the amount and the funds, counting only successful withdrawals; `endOfDay()` resets the totals.

## Reference design
- `AtmImpl` is the public face. It holds the machine and the current `AtmState`, forwards each call to the state, and follows the `Step` the state returns (a status and the next state). It has no rule of its own.
- `AtmState` is the State pattern: an abstract class that answers `WrongState` to everything, and four stateless singletons (`Idle`, `AwaitingPin`, `Ready`, `OutOfService`) that override only what they allow. Since a state has no data, one shared instance each is enough, and a transition is the pointer in the returned `Step`.
- `Machine` bundles what a session uses: the card slot, `CashBox`, `PinGuard` and `Payout`. The states decide when each part may be used; the machine does the work.
- `PinGuard` owns the PIN rules: wrong attempts per card across visits, the third in a row retains, a correct PIN clears, and the set of retained cards.
- `CashBox` owns the notes inside the machine. `Payout` sequences one withdrawal: every check first, then debit, then remove notes, then record.
- `NoteDispenser` is the Strategy for turning an amount into notes. `ChainDispenser` builds the chain of responsibility (`NoteHandler`: take as many of my denomination as I can, pass the rest on, largest first). `FewestNotesDispenser` (Storm 1) is a bounded-knapsack search.
- `WithdrawalLimit` is the rule about how much a card may take: `NoLimit` for the base machine, `DailyLimit` for Storm 2. The payout asks `allows` before it moves anything and calls `record` after success.

Change cost: Storm 1 is one new class (`FewestNotesDispenser`) and one factory line; the chain, the states and the payout are untouched. Storm 2 is one new class (`DailyLimit`), one `Payout` check line, and one factory; the states do not change.

## Alternatives
- **One class with a state enum and `switch` in every method.** It works for four states and four operations (sixteen cells), and for an interview that is a perfectly honest first answer. It gets worse with every new transaction type, because each new operation needs a new switch and it is easy to forget a cell. Say that you chose the State pattern because every cell is a question the code must answer, and a state class with a refuse-by-default base makes forgetting a cell safe.
- **A transition table (map from state and event to next state).** Good when states are numerous and mostly data (protocol machines). Here each cell does real work (check a PIN, pay out), so classes beat a table; with a table you would still need a handler per cell.
- **Per-session data on the state objects.** Natural first draft: `AwaitingPinState` has a `wrongAttempts` field. It then resets on every visit and a thief tries two PINs at a time. Data that outlives a session belongs to a guard keyed by card.
- **A loop over sorted denominations instead of a chain.** Shorter, and fine when links are identical. The chain pays off when links differ (a cassette marked damaged, a link that avoids the last note of a denomination) and when the chain is built from configuration. Either way the order is the algorithm.
- **Backtracking in the chain.** Make each link try fewer notes when the rest fails. It works but is exponential in the worst case and spreads the search across classes that were meant to be simple; a table-based search behind the same interface is clearer and bounded.
- **Debit first, dispense second, refund on failure.** Tempting because the dispense is the step that can fail in the real world. It needs a refund path that can itself fail. Check everything, then debit, then dispense, with a reconciliation process for the crash in between (see the Staff follow-up).
- **Bank-side PIN counter.** What real systems do, so a thief cannot rotate through machines. The exercise keeps it on the machine to practise the "per-card, outlives the session" idea; say so.

## Trade-offs
The State pattern buys safety and locality: every state lists what it allows, the base class refuses the rest, and adding a transaction is one method and one override. It costs a few small classes and a place (the `Step` return) where transitions are visible only by reading the states. The chain of responsibility gives you the first requirement in a dozen lines and a new denomination for free, but it cannot see beyond its own link, and Storm 1 is precisely the case where that blindness shows. Replacing it behind the interface is cheap, which is the argument for putting the dispensing rule behind an interface at all; it is not an argument for starting with the search, which is harder to read and to prove correct. Greedy is also what real machines do when the note set is canonical (100, 50, 20, 10, 5) and stock is plentiful, because for such sets greedy is optimal.

Contested: should a refused card be ejected automatically on an unknown-card error? The contract says it is handed back at once and the machine stays Idle. A real machine keeps the card for a short time to read it; say what you assumed.

## What breaks at 10x
At 10x the stock counts or the withdrawal limit, the search table (size `denominations x amount`, filled in `denominations x amount x stock` steps) becomes a real cost; cap the amount, restrict the search to the denominations that can matter, or precompute per stock level. At 10x the machines you need a fleet design: a central, idempotent transaction service, an authorisation ledger instead of direct debits, and the PIN counter moving to the bank so it holds across machines. At 10x the denominations the chain gets long and greedy stops being optimal for non-canonical sets, so the search becomes the default and the chain a fast path.

## Level signals
- **SDE2:** a working state machine (even with an enum and `switch`), a PIN check with a counter, greedy notes, and the bank asked for balance and debit. Handles `WrongState`. May put the counter in the session and need a nudge to see why it must survive ejecting; may debit before checking the notes.
- **Senior:** asks about the order of checks, what a refused request leaves behind, where the PIN counter lives, and what happens with odd amounts, before drawing anything. Uses State with refuse-by-default, a dispensing interface, check-then-commit, and explains why greedy is the written rule and when it fails. Absorbs Storm 1 by adding one class and Storm 2 by adding one rule without touching the states.
- **Staff:** frames the single-process version as a slice of a distributed transaction: authorisation then capture, idempotency keys, reconciliation after a power cut, and the PIN counter in the bank. Knows when greedy is optimal (canonical note sets) and prices the search. Discusses offline operation as a risk limit, not a code path, and the fleet concerns (replenishment forecasting, monitoring) separately from the class design.
