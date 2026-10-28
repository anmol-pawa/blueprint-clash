import type { ClarifyQuestion } from "@/lib/workshop/types";

export const clarify: ClarifyQuestion[] = [
  { id: "q-limit", text: "Is there a cap on how many books one member can hold?", answer: "Yes: three at a time. A fourth borrow is refused.", reveals: ["R-limit"], quality: "essential" },
  { id: "q-same", text: "Can a member borrow two copies of the same book?", answer: "No. One copy of a given title per member.", reveals: ["R-once"], quality: "essential" },
  { id: "q-errors", text: "What should happen on invalid operations (unknown member, no copies left)?", answer: "Return a specific status. Nothing is thrown and nothing changes.", reveals: ["R-errors"], quality: "essential" },
  { id: "q-copies", text: "Can the library own several copies of one title?", answer: "Yes. Each addBook call carries the copy count.", reveals: ["R-add"], quality: "useful" },
  { id: "q-search", text: "Is author search exact or fuzzy?", answer: "Exact match on the author string, results sorted by book id.", reveals: ["R-author"], quality: "useful" },
  { id: "q-due", text: "Do loans have due dates and fines?", answer: "Not now. Keep the design open to it, but do not build it.", reveals: [], quality: "useful" },
  { id: "q-scale", text: "How many books and members do we expect?", answer: "A branch library: thousands of books, hundreds of members. In-memory is fine.", reveals: [], quality: "useful" },
  { id: "q-ui", text: "Should I build a command-line or a web UI?", answer: "No UI. Only the interface in api.h is tested.", reveals: [], quality: "noise" },
  { id: "q-db", text: "Which database should I persist to?", answer: "None. Everything is in memory for this exercise.", reveals: [], quality: "noise" },
  { id: "q-lang", text: "May I use an external library for the data structures?", answer: "Standard library only.", reveals: [], quality: "noise" },
];
