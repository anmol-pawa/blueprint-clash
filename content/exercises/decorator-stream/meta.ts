import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "decorator-stream",
  title: "Decorator: stackable writers, and the order is the caller's choice",
  concepts: ["decorator", "composition over inheritance", "wrapping order", "ownership chain", "forwarding the whole interface"],
  hints: [
    "Each wrapper is a `Writer` that holds another `Writer`. Put the shared part (owning the wrapped writer, forwarding `flush`) in one small base class so every decorator only adds its single behaviour in `write`.",
    "Hold the inner writer in a `std::unique_ptr<Writer>`: destroying the outermost wrapper then destroys the chain exactly once, with no manual `delete`. Never `release()` it into a raw pointer.",
    "Decorators must forward the *whole* interface, not just `write`: a wrapper that forgets `flush` silently strands buffered data. Do not special-case empty text, and let `CountingWriter` count what it receives, before downstream wrappers change it.",
  ],
  wrong: [
    { dir: "no_flush_forward", failingTests: ["Decorator.FlushReachesTheInnermostWriter"], reason: "The base decorator's flush does nothing, so flushing the outer writer never reaches the destination: the classic way a Decorator breaks the contract of the interface it pretends to be." },
    { dir: "truncate_off_by_one", failingTests: ["Truncate.KeepsAtMostMaxChars", "Decorator.StacksInTheOrderTheCallerChooses"], reason: "Keeps maxChars + 1 characters, so the limit leaks one extra character into every output." },
    { dir: "bracket_skips_empty", failingTests: ["Bracket.WrapsEmptyTextToo"], reason: "Returns early on empty text, so a decorator that should always add its brackets silently drops the write and the destination sees a different number of calls." },
    { dir: "leaks_inner", failingTests: ["Decorator.OwnsAndDestroysTheWrappedWriter"], reason: "Releases the wrapped writer into a raw pointer and never deletes it: the decorator no longer owns what it wraps, so the chain leaks." },
  ],
};
