import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "library-management",
  title: "Library management",
  level: "SDE2",
  parMinutes: 45,
  patterns: ["Strategy (loan policy)"],
  requirements: [
    { id: "R-add", text: "Books (with several copies) and members can be registered; ids are unique.", phase: "base", hidden: false },
    { id: "R-borrow", text: "Borrowing takes one copy off the shelf; returning puts it back.", phase: "base", hidden: false },
    { id: "R-author", text: "Books can be found by author.", phase: "base", hidden: false },
    { id: "R-limit", text: "A member may hold at most 3 books at once.", phase: "base", hidden: true },
    { id: "R-once", text: "A member cannot hold two copies of the same book at the same time.", phase: "base", hidden: true },
    { id: "R-errors", text: "Failures are reported with specific statuses, never by crashing; a failed call changes nothing.", phase: "base", hidden: true },
  ],
  bad: [
    {
      dir: "no_limit",
      failsPhase: "base",
      failingTests: ["Limits.FourthBookIsRefused"],
      reason: "The loan limit was never asked about, so it is missing. Behaviour tests catch it; a clarifying question would have prevented it.",
    },
    {
      dir: "duplicate_borrow",
      failsPhase: "base",
      failingTests: ["Limits.SameBookTwiceIsRefused"],
      reason: "Checks copies but not whether this member already holds one. Two copies of one title end up with one reader.",
    },
    {
      dir: "lost_copies",
      failsPhase: "base",
      failingTests: ["Borrowing.ReturnRestoresCopy", "Limits.ReturnFreesALoanSlot"],
      reason: "Return removes the loan but forgets to put the copy back: the shelf count drifts down forever. Two data structures kept in sync by hand is the smell; the reference keeps the count in one place.",
    },
  ],
};
