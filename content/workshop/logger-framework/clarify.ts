import type { ClarifyQuestion } from "@/lib/workshop/types";

export const clarify: ClarifyQuestion[] = [
  { id: "q-clock", text: "Where does the timestamp come from? How do we test it?", answer: "A Clock is passed in and the tests script it. The logger reads it once for every message it accepts, and not at all for a message it drops.", reveals: ["R-stamp"], quality: "essential" },
  { id: "q-levels", text: "How do levels work? Is there a default, and does a dropped message cost anything?", answer: "Debug < Info < Warn < Error. The logger starts at Info. A call below the logger's level is dropped before anything else: no clock read, no count, no sink sees it.", reveals: ["R-levels"], quality: "essential" },
  { id: "q-sinks", text: "How many sinks can there be, and does each choose its own level? In what order are they called?", answer: "Any number. Each sink is added with its own threshold and gets the records at or above it, in the order the sinks were added. The logger's own level is applied first.", reveals: ["R-sinks"], quality: "essential" },
  { id: "q-manage", text: "Can sinks be removed later? What identifies one? Can a sink be null?", answer: "addSink returns an id (1, 2, 3, never reused); removeSink takes it. A null sink is refused with -1, and a null clock makes makeLogger return nullptr.", reveals: ["R-manage"], quality: "essential" },
  { id: "q-flush", text: "Do sinks buffer? Who tells them to push their data out?", answer: "A sink can hold data back. Logger::flush() calls flush() on every sink, in order added.", reveals: ["R-flush"], quality: "useful" },
  { id: "q-future", text: "Will the output stay as plain records? What would a team ask for next?", answer: "Teams want formatted text lines with a pattern, and they want a flood of identical messages collapsed into one line with a count. Details arrive with the change.", reveals: ["R-pattern", "R-dedup"], quality: "essential" },
  { id: "q-thread", text: "Must it be thread-safe?", answer: "Not for this round: one thread. Say how you would add it (a lock around dispatch, or a queue and a writer thread) in the follow-ups.", reveals: [], quality: "useful" },
  { id: "q-failure", text: "What if a sink fails to write?", answer: "Sinks report nothing back in this version. The follow-up discussion covers failure policy.", reveals: [], quality: "useful" },
  { id: "q-fields", text: "Do records carry a logger name, key-value fields or an exception?", answer: "No. Level, time and message only.", reveals: [], quality: "useful" },
  { id: "q-file", text: "Do I have to write the console and file sinks?", answer: "No. The tests bring their own sinks. Only the interface in api.h matters.", reveals: [], quality: "noise" },
  { id: "q-color", text: "Should the console output be coloured, or localised?", answer: "No.", reveals: [], quality: "noise" },
];
