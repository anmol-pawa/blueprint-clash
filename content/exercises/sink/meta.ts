import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "sink",
  title: "Sink: a non-virtual interface that guards its own contract",
  concepts: ["non-virtual interface (NVI)", "template method", "private virtual", "enforcing invariants in a base class"],
  hints: [
    "Subclasses decide *where* the text goes. Who should decide that empty messages are skipped and every message is numbered?",
    "Make the public `write` non-virtual: it does the checks, then calls a private pure virtual `emit`. Subclasses can still override a private virtual.",
    "`void write(const std::string& m) { if (m.empty()) return; ++written_; emit(\"[\" + std::to_string(written_) + \"] \" + m); }` and `virtual void emit(const std::string&) = 0;` in the private section.",
  ],
  wrong: [
    { dir: "public_virtual_write", failingTests: ["Contract.SubclassCannotBypassTheChecks"], reason: "write() is virtual, so a subclass can override it and skip numbering, filtering and counting: the base class cannot guard its contract." },
    { dir: "empty_not_skipped", failingTests: ["Write.EmptyMessagesAreSkipped", "Write.SkippedMessagesAreNotCounted"], reason: "Forwards empty messages to emit() and counts them." },
    { dir: "counts_skipped", failingTests: ["Write.SkippedMessagesAreNotCounted"], reason: "Counts the skipped (empty) messages, so written() and the sequence numbers drift." },
  ],
};
