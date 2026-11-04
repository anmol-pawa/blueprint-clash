import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "pool-lease",
  title: "Object pool with RAII leases",
  concepts: ["object pool", "RAII lease", "move-only handle", "resource reset", "ownership"],
  hints: [
    "Callers must never have to remember to give the buffer back. Return a small handle object whose destructor does it.",
    "The pool holds `std::vector<std::unique_ptr<Buffer>>` for stable addresses and a `std::vector<Buffer*>` of idle ones. `acquire` pops from the idle list; `giveBack` clears the buffer and pushes it.",
    "Lease: delete copy; move constructor steals the pointers and nulls the source; move assignment does `release()` first, then steals (guard self-assignment); the destructor calls `release()`.",
  ],
  wrong: [
    { dir: "no_reset", failingTests: ["Pool.ReturnedBufferIsClearedAndReused"], reason: "Puts the buffer back dirty, so the next request sees the previous request's bytes (a data leak between users)." },
    { dir: "double_release", failingTests: ["Lease.MoveTransfersOwnershipOnce"], reason: "The move constructor copies the pointers without nulling the source, so both leases give the buffer back and the pool hands it to two users." },
    { dir: "assign_leaks", failingTests: ["Lease.MoveAssignReleasesWhatItHeld"], reason: "Move assignment overwrites a live lease without releasing it, so that buffer is lost forever and the pool slowly runs dry." },
    { dir: "never_exhausts", failingTests: ["Pool.ExhaustedGivesAnEmptyLease"], reason: "Allocates a fresh buffer when none is idle, so the 'bound' is fictional and memory is unbounded under load." },
  ],
};
