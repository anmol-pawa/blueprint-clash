import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "file-handle",
  title: "FileHandle: RAII and move-only ownership",
  concepts: ["RAII", "rule of five", "move-only types", "self-assignment"],
  hints: [
    "Who is responsible for calling `os::close`? Make that the destructor's job, never the caller's.",
    "If two objects could hold the same id, both destructors would close it. Delete the copy operations and write the moves.",
    "A move must leave the source owning nothing. `std::exchange(other.id_, 0)` takes the id and empties the source in one expression. Close the old id before overwriting it in move assignment.",
  ],
  wrong: [
    { dir: "leaks", failingTests: ["Lifetime.OpensOnConstructionClosesOnScopeExit", "Lifetime.ManyHandlesAreAllReleased"], reason: "No destructor: every handle leaks its id. RAII is the destructor." },
    { dir: "copyable", failingTests: ["Ownership.CannotBeCopied", "Move.ConstructionTransfersTheId"], reason: "Default copy gives two owners of one id, so the second close is an error. Resource owners delete copy." },
    { dir: "move_leaves_owner", failingTests: ["Move.ConstructionTransfersTheId", "Move.AssignmentClosesTheOldFileFirst"], reason: "The moved-from handle still believes it owns the id, so both destructors close it." },
    { dir: "assign_leaks", failingTests: ["Move.AssignmentClosesTheOldFileFirst"], reason: "Move assignment overwrites the id it already owned without closing it." },
  ],
};
