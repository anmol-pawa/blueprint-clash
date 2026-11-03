import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { rubric } from "@/content/workshop/library-management/rubric";
import { boardToSkeleton, findInheritanceCycle, scoreBoard, validateBoard, type Board, type BoardClass } from "@/lib/board";

const cls = (id: string, name: string, over: Partial<BoardClass> = {}): BoardClass => ({
  id, name, kind: "class", fields: [], methods: [], responsibilities: [], ...over,
});

const good: Board = {
  classes: [
    cls("svc", "LibraryService", { responsibilities: ["res-facade"], methods: [{ name: "borrow", returns: "bool", params: "int memberId, int bookId", isConst: false, isAbstract: false }] }),
    cls("cat", "Catalog", { responsibilities: ["res-catalog"] , fields: [{ name: "copies", type: "std::map<int, int>" }]}),
    cls("mem", "Member", { responsibilities: ["res-members"] }),
    cls("pol", "LoanPolicy", { kind: "interface", responsibilities: ["res-policy"], methods: [{ name: "canBorrow", returns: "bool", params: "const Member& m", isConst: true, isAbstract: true }] }),
    cls("fix", "FixedLimitPolicy", { methods: [{ name: "canBorrow", returns: "bool", params: "const Member& m", isConst: true, isAbstract: false }] }),
    cls("tier", "TierLimitPolicy", { responsibilities: ["res-tier"] }),
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

describe("validateBoard", () => {
  it("accepts a sound board", () => {
    expect(validateBoard(good).filter((i) => i.severity === "error")).toEqual([]);
  });
  it("rejects duplicate and invalid names, bad multiplicity, and implementing a concrete class", () => {
    const b: Board = {
      classes: [cls("a", "Foo"), cls("b", "Foo"), cls("c", "3bad")],
      edges: [{ id: "x", from: "a", to: "b", kind: "implements", fromMult: "lots" }],
    };
    const msgs = validateBoard(b).map((i) => i.message).join("|");
    expect(msgs).toContain("Two classes are called Foo");
    expect(msgs).toContain("not a valid C++ name");
    expect(msgs).toContain("neither an interface");
    expect(msgs).toContain("Bad multiplicity");
  });
  it("finds inheritance cycles", () => {
    const b: Board = {
      classes: [cls("a", "A"), cls("b", "B")],
      edges: [{ id: "1", from: "a", to: "b", kind: "inherits" }, { id: "2", from: "b", to: "a", kind: "inherits" }],
    };
    expect(findInheritanceCycle(b)).toEqual(["A", "B", "A"]);
    expect(findInheritanceCycle(good)).toBeNull();
  });
  it("flags edges to deleted classes", () => {
    expect(validateBoard({ classes: [cls("a", "A")], edges: [{ id: "1", from: "a", to: "gone", kind: "association" }] })[0].severity).toBe("error");
  });
});

describe("scoreBoard", () => {
  it("gives full marks to the intended design", () => {
    const s = scoreBoard(good, rubric);
    expect(s.results.every((r) => r.verdict === "ok")).toBe(true);
    expect(s.flags).toEqual([]);
    expect(s.score).toBe(1);
  });
  it("only counts responsibilities up to the phase", () => {
    expect(scoreBoard(good, rubric, "base").results).toHaveLength(4);
  });
  it("matches names loosely", () => {
    const b: Board = { ...good, classes: good.classes.map((c) => (c.id === "pol" ? { ...c, name: "loan_policy" } : c)) };
    expect(scoreBoard(b, rubric).results.find((r) => r.id === "res-policy")!.verdict).toBe("ok");
  });
  it("flags missing, misplaced and duplicated responsibilities", () => {
    const b: Board = {
      ...good,
      classes: good.classes.map((c) => {
        if (c.id === "svc") return { ...c, responsibilities: ["res-facade", "res-policy"] }; // duplicate policy
        if (c.id === "cat") return { ...c, responsibilities: ["res-members"] }; // misplaced members + duplicate
        if (c.id === "tier") return { ...c, responsibilities: [] }; // missing tier
        return c;
      }),
    };
    const s = scoreBoard(b, rubric);
    const v = Object.fromEntries(s.results.map((r) => [r.id, r.verdict]));
    expect(v["res-policy"]).toBe("duplicated");
    expect(v["res-members"]).toBe("duplicated");
    expect(v["res-catalog"]).toBe("missing");
    expect(v["res-tier"]).toBe("missing");
    expect(s.score).toBeLessThan(0.5);
  });
  it("penalises a god class", () => {
    const god = cls("g", "Everything", { responsibilities: rubric.map((r) => r.id) });
    const s = scoreBoard({ classes: [god], edges: [] }, rubric);
    expect(s.flags.some((f) => f.kind === "god-class")).toBe(true);
    expect(s.results.every((r) => r.verdict === "misplaced")).toBe(true);
    expect(s.score).toBeLessThan(0.5);
  });
  it("flags unconnected and empty classes", () => {
    const b: Board = { ...good, classes: [...good.classes, cls("x", "Lonely")] };
    const kinds = scoreBoard(b, rubric).flags.map((f) => f.kind);
    expect(kinds).toContain("unrelated-class");
    expect(kinds).toContain("empty-class");
  });
  it("scores an empty board 0", () => {
    expect(scoreBoard({ classes: [], edges: [] }, rubric).score).toBe(0);
  });
});

describe("boardToSkeleton", () => {
  const files = boardToSkeleton(good);
  const get = (n: string) => files.find((f) => f.path === n)!.content;
  it("emits a header per class with ownership from the UML", () => {
    expect(files.map((f) => f.path).sort()).toEqual(["Catalog.h", "FixedLimitPolicy.h", "LibraryService.h", "LoanPolicy.h", "Member.h", "TierLimitPolicy.h"]);
    expect(get("LibraryService.h")).toContain("std::unique_ptr<Catalog> catalog_;");
    expect(get("LibraryService.h")).toContain("std::vector<std::unique_ptr<Member>> members_;");
    expect(get("LibraryService.h")).toContain("LoanPolicy* loanPolicy_ = nullptr;");
  });
  it("makes interfaces pure virtual with a virtual destructor, and overrides marked", () => {
    expect(get("LoanPolicy.h")).toContain("virtual ~LoanPolicy() = default;");
    expect(get("LoanPolicy.h")).toContain("virtual bool canBorrow(const Member& m) const = 0;");
    expect(get("FixedLimitPolicy.h")).toContain("bool canBorrow(const Member& m) const override;");
    expect(get("FixedLimitPolicy.h")).toContain("class FixedLimitPolicy : public LoanPolicy {");
  });
  it("refuses a board with errors", () => {
    expect(() => boardToSkeleton({ classes: [cls("a", "9x")], edges: [] })).toThrow(/valid C\+\+ name/);
  });
  it("produces headers that compile with a real C++ compiler", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "board-"));
    for (const f of files) writeFileSync(path.join(dir, f.path), f.content);
    const main = path.join(dir, "main.cpp");
    writeFileSync(main, files.map((f) => `#include "${f.path}"`).join("\n") + "\nint main() {}\n");
    expect(() => execFileSync("g++", ["-std=c++17", "-fsyntax-only", "-Wall", "-I", dir, main], { stdio: "pipe" })).not.toThrow();
  });
});
