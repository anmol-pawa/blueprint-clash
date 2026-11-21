# Editorial: Stack Overflow-lite

## Requirements
Functional: add users; ask a question; answer it; vote a post up or down (one vote per voter per post, switching replaces, `unvote` takes it back); accept an answer; read a user's reputation, a post's score and a question's ordered answers. Then a daily cap on what upvotes can earn, and then authors deleting their posts.

Hidden in the brief and revealed by good questions: the points table (+5 and +10 for upvotes, -2 for a downvote, -1 more for the voter who downvotes an answer, +15 and +2 for an acceptance and nothing for accepting your own answer); that reputation is derived and floored at 1 on the **total**; the voting rules (self vote, a downvote needs reputation 15, `AlreadyVoted` versus switching); the order of the statuses; that a question has at most one accepted answer and moving it moves the points; and the order of `answers`.

**Change Storm 1, a daily cap:** per user and day, upvote points count at most the cap; penalties and acceptances are uncapped; a switched vote belongs to the day it was cast; taking a vote back can lift a day back under the cap.

**Change Storm 2, deleting posts:** only the author may delete; a question takes its answers with it; every vote, acceptance and point that depended on a deleted post disappears; ids are free and clean again; votes the author cast elsewhere stay.

## Reference design
`SiteImpl` is a thin facade: it checks the documented rules in order and writes to the collaborators. It does no point arithmetic. `PostBoard` owns the live posts (kind, author, parent, creation sequence). `VoteBook` keeps every vote that stands, one per voter per post, with its day. `AcceptBook` maps a question to its accepted answer. These three hold **facts** and nothing else.

`Ledger` turns the facts into `ReputationEvent`s for one user (an upvote pays the author by kind, a downvote charges the author and, on an answer, the voter; an acceptance pays the answer's author and the asker unless they are the same person). A `ReputationPolicy` adds the events up: `PlainPolicy` sums them, `DailyCapPolicy` limits the capped events per day. The floor is applied once, to the total. Reputation is therefore never stored, and every undo is just 'remove a fact'.

Storm 1 added the clock, one new policy class and a factory; the ledger, the books and the existing policy were not edited. Storm 2 added `PostRemover`, which removes a post with its votes and acceptance (and a question's answers) in one place, and one method to the facade. Because reputation is derived, nothing needed correcting after a delete. `AnswerLister` builds the ordered list from the three books.

## Alternatives
- **Stored balances updated by each action.** Reading is O(1) and the code is short at first. Every undo (unvote, switch, move acceptance, delete) needs a mirror-image update, the floor makes some of those wrong, and the cap makes every later vote depend on earlier ones. Fast to write, slow to keep correct.
- **Event log with replay.** Store each reward and reversal as an event and replay for reputation. Equivalent to this design when the reversals are modelled; the facts-first version avoids having to invent compensating events and keeps the data smaller.
- **Per-user event lists maintained on every write.** An index from user to the votes and acceptances that affect them; reputation reads only those. A good optimisation of the reference (the 10x section), but it must be updated in the same places the books are, so it is a second structure that can drift.
- **Soft-deleted posts.** Keep a flag and filter in every reader. Keeps history for moderation, at the price of every reader remembering the flag.
- **One class with `if (kind == ...)` for points.** A fine first draft; the cap and the delete each add branches to the same methods.

## Trade-offs
- **Derive instead of store.** Every rule that removes something becomes trivial and exact; reads cost a pass over the facts (here a scan of all votes) until a cache is added.
- **Policy as a Strategy over events.** The cap is rewritten from events every time, so it stays right under undo. The cost is one small interface and the discipline that events carry what the policy needs (day, whether capped).
- **Hard delete.** Exact numbers and clean ids, but no audit history; real sites soft-delete underneath.
- **The privilege check reads current reputation.** Correct and simple, but it ties a vote to a derived number, which is a race in a concurrent system.
- **Ordering rule for statuses.** A fixed, documented order is the only thing a caller can rely on when several things are wrong at once.

## What breaks at 10x
- **Reputation reads:** `reputation()` walks every vote and acceptance. Keep a per-user index of the events that affect them, or a cache invalidated for the users a write touches (author, voter, asker).
- **Answers:** `PostBoard::answersOf` scans every post. Keep a list of answers per question.
- **Votes:** the `VoteBook` is a nested map by post; fine to millions of votes in memory, then it belongs in a table keyed by (post, voter) with an index by user.
- **Threads:** the downvote privilege check and the write must be atomic; one writer per user or a transaction with the check as a condition.
- **Scale-out:** the facts are an append-friendly stream; derive reputation in a stream processor and serve it from a cache, with a periodic full recompute as the audit.
- **Abuse:** voting rings are a policy problem on the same facts, handled by offline detection and compensating reversals.

## Level signals
- **SDE II:** the points table right, the statuses in a sensible order with a refused call changing nothing, a vote switch that replaces the old effects, and an accepted answer that moves cleanly. Names and classes that separate posts, votes and the rules.
- **Senior:** reputation derived from facts (and the floor on the total), a clean undo for every action, the cap as a policy rather than a branch, and a delete that removes the post and everything hanging on it in one place. Tests that compare against a plain model.
- **Staff:** frames derived versus stored versus event-sourced reputation and what each does under undo and scale, raises the privilege race, caching and invalidation sets, streaming derivation with reconciliation, soft versus hard delete for audit, and abuse detection (voting rings) as policies over the same facts, naming what each choice gives up.
