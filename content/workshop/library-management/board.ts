import type { Board, BoardClass } from "@/lib/board";

const cls = (id: string, name: string, over: Partial<BoardClass> = {}): BoardClass => ({
  id, name, kind: "class", fields: [], methods: [], responsibilities: [], ...over,
});

const m = (name: string, returns: string, params: string, isConst: boolean, isAbstract = false) => ({ name, returns, params, isConst, isAbstract });

/**
 * Reference Design Board for Library Management: one owner per rubric responsibility, the loan limit behind
 * a `LoanPolicy` seam (so the tier storm adds a class instead of editing the borrow flow), and a thin
 * `LibraryService` that only coordinates. Shown in the debrief next to the player's board.
 */
export const referenceBoard: Board = {
  classes: [
    cls("svc", "LibraryService", {
      responsibilities: ["res-facade"],
      methods: [m("borrow", "bool", "int memberId, int bookId", false), m("giveBack", "bool", "int memberId, int bookId", false)],
    }),
    cls("cat", "Catalog", { responsibilities: ["res-catalog"], fields: [{ name: "copies_", type: "std::map<int, int>" }], methods: [m("take", "bool", "int bookId", false), m("restore", "void", "int bookId", false)] }),
    cls("mem", "Member", { responsibilities: ["res-members"], fields: [{ name: "held_", type: "std::set<int>" }], methods: [m("holdCount", "int", "", true)] }),
    cls("pol", "LoanPolicy", { kind: "interface", responsibilities: ["res-policy"], methods: [m("canBorrow", "bool", "const Member& m", true, true)] }),
    cls("fix", "FixedLimitPolicy", { methods: [m("canBorrow", "bool", "const Member& m", true)] }),
    cls("tier", "TierLimitPolicy", { responsibilities: ["res-tier"], methods: [m("canBorrow", "bool", "const Member& m", true)] }),
  ],
  edges: [
    { id: "e1", from: "svc", to: "cat", kind: "composition", toMult: "1" },
    { id: "e2", from: "svc", to: "mem", kind: "composition", toMult: "*" },
    { id: "e3", from: "svc", to: "pol", kind: "aggregation", toMult: "1" },
    { id: "e4", from: "fix", to: "pol", kind: "implements" },
    { id: "e5", from: "tier", to: "pol", kind: "implements" },
    { id: "e6", from: "pol", to: "mem", kind: "dependency" },
  ],
};

/** A plausible weak board: everything on the service (a god class), no policy seam. Must score low. */
export const godServiceBoard: Board = {
  classes: [
    cls("svc", "LibraryService", { responsibilities: ["res-facade", "res-catalog", "res-members", "res-policy", "res-tier"] }),
    cls("mem", "Member"),
    cls("book", "Book"),
  ],
  edges: [{ id: "e1", from: "svc", to: "mem", kind: "composition", toMult: "*" }],
};
