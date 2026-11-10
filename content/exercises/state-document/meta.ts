import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "state-document",
  title: "State: a document workflow without a switch on its state",
  concepts: ["state", "polymorphism", "state machine", "illegal transitions", "open/closed", "ownership"],
  hints: [
    "Define a private interface `State` with a virtual method per action. Each concrete state (`Draft`, `Review`, `Published`) answers the actions it allows and refuses the rest. `Document` holds a `std::unique_ptr<State>` and forwards every call.",
    "Let each handler return the *next* state (or null for 'not allowed / stay put'), so a state is never destroyed while its own method is still running: `Document` swaps `state_` only after the handler has returned.",
    "`edit()` is the only action that stays in the same state but changes data, so it needs the revision counter: let `Document` increment `revision_` when the state reports the edit as allowed.",
  ],
  wrong: [
    { dir: "edit_allowed_in_review", failingTests: ["Workflow.EditIsRefusedInReview"], reason: "The review state forgot to refuse edit(): a document under review keeps changing under the reviewer's feet." },
    { dir: "reject_keeps_review", failingTests: ["Workflow.RejectSendsReviewBackToDraft"], reason: "reject() reports success but the state never changes, so the author can never fix a rejected document." },
    { dir: "published_is_editable", failingTests: ["Workflow.PublishedIsFinal"], reason: "Published documents still accept edit() and bump the revision: the terminal state is not terminal." },
    { dir: "illegal_action_still_moves", failingTests: ["Workflow.ApproveFromDraftIsRefusedAndChangesNothing"], reason: "approve() in draft returns false but still jumps to published: a refused action must have no side effects." },
    { dir: "refused_edit_counts", failingTests: ["Workflow.RefusedEditsDoNotChangeTheRevision"], reason: "Increments the revision before asking the state, so refused edits are counted." },
  ],
};
