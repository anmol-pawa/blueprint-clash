import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "chain-approval",
  title: "Chain of Responsibility: expense approvals",
  concepts: ["chain of responsibility", "linked ownership", "fluent chaining", "open/closed", "explicit fallback"],
  hints: [
    "Each link holds `std::unique_ptr<Approver> next_`. `handle` asks this link first (`canApprove`), and only if it cannot does it call `next_->handle(...)`.",
    "`then` moves the pointer into `next_` and returns `*next_`, not `*this`; that is what lets `a->then(b).then(c)` append c to b instead of replacing b. Remember to guard `next_` against null before forwarding.",
    "`handle`: `if (canApprove(e)) return role(); if (next_) return next_->handle(e); return \"rejected\";`. `LimitApprover::canApprove` is `e.cents > 0 && e.cents <= limitCents_`. Keep `canApprove` and `role` protected: callers go through `handle`.",
  ],
  wrong: [
    { dir: "asks_everyone", failingTests: ["Chain.StopsAtTheFirstLinkThatApproves"], reason: "Keeps walking the chain after a link has approved and returns the last approver's role: later links see requests that were already handled, and the wrong person gets the credit." },
    { dir: "last_wins", failingTests: ["Chain.SmallExpenseIsApprovedByTheFirstLink", "Chain.OrderOfLinksDecidesWhoAnswers"], reason: "Returns the last capable approver rather than the first: a 250.00 expense is signed off by the VP." },
    { dir: "no_forwarding", failingTests: ["Chain.LargerExpensesMoveUpTheChain"], reason: "Never forwards: the head answers or rejects, so the chain is a single link with extra objects attached." },
    { dir: "limit_exclusive", failingTests: ["Chain.LimitsAreInclusive"], reason: "Uses `<` instead of `<=`: an expense exactly at a limit escalates one level too far." },
    { dir: "empty_fallback", failingTests: ["Chain.FallingOffTheEndIsRejected", "Chain.ASingleLinkWithNoSuccessorRejectsWhatItCannotApprove"], reason: "Falling off the end returns an empty string instead of an explicit \"rejected\": the caller cannot tell a refusal from a bug." },
    { dir: "then_returns_this", failingTests: ["Chain.ThenReturnsTheAppendedLinkSoChainsKeepGrowing", "Chain.LargerExpensesMoveUpTheChain"], reason: "then() returns *this, so a.then(b).then(c) replaces b with c and the middle link silently disappears." },
    { dir: "accepts_non_positive", failingTests: ["Chain.NonPositiveAmountsAreNobodysToApprove"], reason: "Approves zero and negative amounts: a refund typed as an expense is signed off by the manager." },
  ],
};
