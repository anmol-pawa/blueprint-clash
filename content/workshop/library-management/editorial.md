# Editorial: Library management

## Requirements
Functional: register books (with copy counts) and members, borrow, return, search by author. Hidden until asked: a three-book limit, one copy of a title per member, and specific statuses for every failure (a failed call changes nothing). Non-goals: persistence, UI, due dates (but keep them cheap to add).

## Reference design
- `Catalog` owns books and their shelf counts; it is the only place a count changes.
- `Member` owns its id, name and the set of book ids it holds.
- `LoanPolicy` (abstract) answers "may this member borrow one more?"; `FixedLimitPolicy(3)` is the rule here.
- `LibraryService` implements `lib::Library`. It validates, asks the policy, then mutates: check everything first, change state last.

Ownership: the service owns catalog, members and a `unique_ptr<LoanPolicy>`. No raw `new`, no shared state outside the service.

## Alternatives
- **One big `Library` class with two maps** is the fastest to type and passes the base tests. It is also where the bugs in `bad/` come from, and it turns every later requirement into an edit of the same method. Fine for a 20-minute warm-up, weak in a 90-minute round.
- **A `Loan` entity** (member, book, date) instead of a set of ids is better the moment due dates arrive; for the base phase it is one class too many. Say so out loud and move on.
- **A per-title `Book` object holding its own copy count** is reasonable too; the Catalog-owns-counts version keeps the invariant in one place.

## Trade-offs
Policy as a class costs one interface and one file; it buys the Open/Closed seam where the interviewer is most likely to push. A constant is cheaper and correct if limits never vary. Status codes instead of exceptions keep call sites explicit and work in the browser toolchain (no exception runtime); the cost is that a caller can ignore a result, which `[[nodiscard]]` on the status type would catch in a real codebase.

## What breaks at 10x
At 10x the data (tens of thousands of books) the maps are still fine and author search becomes the first scan worth indexing (`unordered_map<author, set<id>>`). At 10x the callers (concurrent staff terminals) the lack of locking becomes the issue: see the follow-up on thread safety.

## Level signals
- **SDE2:** correct behaviour, clear class split, asks about limits and duplicates, tests its own edge cases.
- **Senior:** names the extension seam (policy), validates before mutating, discusses concurrency and due dates unprompted, keeps the design small.
- **Staff:** frames what is likely to change and what is not, ties the in-memory design to the multi-branch future, and states what they deliberately did not build.
