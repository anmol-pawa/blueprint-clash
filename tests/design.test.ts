import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addClass, addMember, addRelation, emptyBoard, exportSkeleton, removeClass, removeMember, removeRelation, renameClass,
  scoreBoard, setKind, toggleTag, validateBoard, isIdentifier, isTypeSpelling, isMultiplicity, type Board, type Result,
} from "@/lib/design";
import { rubric } from "@/content/workshop/library-management/rubric";

function must<T>(r: Result<T>): { board: Board; value: T } {
  if (!r.ok) throw new Error(r.error);
  return r;
}

/** A small parking-lot board used by several tests. */
function parking(): { board: Board; ids: Record<string, string> } {
  let b = emptyBoard();
  const ids: Record<string, string> = {};
  for (const [n, k] of [["ParkingLot", "class"], ["Spot", "abstract"], ["CompactSpot", "class"], ["FeePolicy", "interface"], ["Ticket", "class"], ["Vehicle", "enum"]] as const) {
    const r = must(addClass(b, n, k));
    b = r.board;
    ids[n] = r.value;
  }
  b = must(addMember(b, ids.Spot, "method", { name: "fits", type: "bool", visibility: "public", params: "const Vehicle& v", isConst: true })).board;
  b = must(addMember(b, ids.FeePolicy, "method", { name: "feeFor", type: "long long", visibility: "public", params: "int minutes", isConst: true })).board;
  b = must(addMember(b, ids.Ticket, "field", { name: "id", type: "std::string", visibility: "private" })).board;
  b = must(addMember(b, ids.Vehicle, "field", { name: "Car", type: "int", visibility: "public" })).board;
  b = must(addRelation(b, "inherits", ids.CompactSpot, ids.Spot)).board;
  b = must(addRelation(b, "composition", ids.ParkingLot, ids.Spot, { multiplicity: "*" })).board;
  b = must(addRelation(b, "aggregation", ids.ParkingLot, ids.FeePolicy)).board;
  b = must(addRelation(b, "association", ids.ParkingLot, ids.Ticket, { multiplicity: "0..*" })).board;
  return { board: b, ids };
}

describe("validation helpers", () => {
  it("accepts C++ names and rejects keywords and junk", () => {
    expect(isIdentifier("ParkingLot")).toBe(true);
    expect(isIdentifier("class")).toBe(false);
    expect(isIdentifier("9lives")).toBe(false);
    expect(isIdentifier("a b")).toBe(false);
    expect(isTypeSpelling("std::vector<std::string>")).toBe(true);
    expect(isTypeSpelling("const Foo&")).toBe(true);
    expect(isTypeSpelling("vector<int")).toBe(false);
    expect(isTypeSpelling("int; rm")).toBe(false);
    expect(["1", "0..1", "*", "1..*", "2..5"].every(isMultiplicity)).toBe(true);
    expect(["", "x", "1..", "..*"].some(isMultiplicity)).toBe(false);
  });
});

describe("board operations", () => {
  it("rejects duplicate and invalid class names, supports rename", () => {
    const a = must(addClass(emptyBoard(), "Order"));
    expect(addClass(a.board, "Order").ok).toBe(false);
    expect(addClass(a.board, "my class").ok).toBe(false);
    const r = must(renameClass(a.board, a.value, "Purchase"));
    expect(r.board.classes[0].name).toBe("Purchase");
    const b = must(addClass(r.board, "Other"));
    expect(renameClass(b.board, b.value, "Purchase").ok).toBe(false);
  });

  it("does not mutate the previous board", () => {
    const a = must(addClass(emptyBoard(), "Order"));
    const before = JSON.stringify(a.board);
    must(addMember(a.board, a.value, "field", { name: "total", type: "long long", visibility: "private" }));
    expect(JSON.stringify(a.board)).toBe(before);
  });

  it("checks member rules by kind", () => {
    const { board, ids } = parking();
    expect(addMember(board, ids.FeePolicy, "field", { name: "x", type: "int", visibility: "private" }).ok).toBe(false);
    expect(addMember(board, ids.Vehicle, "method", { name: "go", type: "void", visibility: "public" }).ok).toBe(false);
    expect(addMember(board, ids.Ticket, "field", { name: "id", type: "int", visibility: "private" }).ok).toBe(false);
    expect(addMember(board, ids.Ticket, "field", { name: "bad", type: "vector<", visibility: "private" }).ok).toBe(false);
    expect(addMember(board, ids.Spot, "method", { name: "fits", type: "bool", visibility: "public", params: "const Vehicle& v" }).ok).toBe(false);
    // Overloads with different parameters are fine.
    expect(addMember(board, ids.Spot, "method", { name: "fits", type: "bool", visibility: "public", params: "int size" }).ok).toBe(true);
    const removed = must(removeMember(board, ids.Ticket, "field", 0));
    expect(removed.board.classes.find((c) => c.id === ids.Ticket)?.fields).toHaveLength(0);
    expect(removeMember(board, ids.Ticket, "field", 5).ok).toBe(false);
  });

  it("enforces relationship rules", () => {
    const { board, ids } = parking();
    expect(addRelation(board, "implements", ids.CompactSpot, ids.Ticket).ok).toBe(false); // not an interface
    expect(addRelation(board, "inherits", ids.CompactSpot, ids.FeePolicy).ok).toBe(false); // use implements
    expect(addRelation(board, "inherits", ids.Spot, ids.CompactSpot).ok).toBe(false); // cycle
    expect(addRelation(board, "inherits", ids.Spot, ids.Spot).ok).toBe(false);
    expect(addRelation(board, "inherits", ids.Ticket, ids.Vehicle).ok).toBe(false); // enum base
    expect(addRelation(board, "association", ids.Vehicle, ids.Ticket).ok).toBe(false); // enum owns
    expect(addRelation(board, "association", ids.Ticket, ids.Spot, { multiplicity: "lots" }).ok).toBe(false);
    expect(addRelation(board, "aggregation", ids.ParkingLot, ids.FeePolicy).ok).toBe(false); // duplicate
    expect(addRelation(board, "implements", ids.CompactSpot, ids.FeePolicy).ok).toBe(true);
    expect(addRelation(board, "dependency", ids.Ticket, ids.Vehicle).ok).toBe(true);
    expect(setKind(board, ids.ParkingLot, "enum").ok).toBe(false); // already owns things
  });

  it("removing a class drops its relations and tags", () => {
    const { board, ids } = parking();
    const tagged = must(toggleTag(board, "res-x", ids.Ticket)).board;
    const r = must(removeClass(tagged, ids.Ticket));
    expect(r.board.relations.every((x) => x.from !== ids.Ticket && x.to !== ids.Ticket)).toBe(true);
    expect(r.board.tags["res-x"]).toBeUndefined();
    expect(validateBoard(r.board).filter((i) => i.severity === "error")).toEqual([]);
    const rel = r.board.relations[0];
    expect(removeRelation(r.board, rel.id).ok).toBe(true);
    expect(removeRelation(r.board, "nope").ok).toBe(false);
  });

  it("warns about empty classes, bare interfaces and god classes", () => {
    let b = emptyBoard();
    const e = must(addClass(b, "Empty"));
    const i = must(addClass(e.board, "Iface", "interface"));
    b = i.board;
    expect(validateBoard(b).map((x) => x.message).join("|")).toMatch(/Empty is empty.*Iface has no methods/);
    const g = must(addClass(emptyBoard(), "God"));
    let godBoard = g.board;
    for (let n = 0; n < 13; n++) godBoard = must(addMember(godBoard, g.value, "method", { name: `m${n}`, type: "void", visibility: "public" })).board;
    expect(validateBoard(godBoard).some((x) => /god class/.test(x.message))).toBe(true);
  });
});

describe("responsibility scoring", () => {
  function libraryBoard(tagging: Record<string, string[]>): Board {
    let b = emptyBoard();
    const ids: Record<string, string> = {};
    for (const n of ["Catalog", "Member", "LoanPolicy", "LibraryService", "TierLimitPolicy", "Widget"]) {
      const r = must(addClass(b, n));
      b = r.board;
      ids[n] = r.value;
    }
    for (const [res, names] of Object.entries(tagging)) for (const n of names) b = must(toggleTag(b, res, ids[n])).board;
    return b;
  }

  it("scores a correct base tagging as 1 and ignores later-storm responsibilities", () => {
    const b = libraryBoard({ "res-catalog": ["Catalog"], "res-members": ["Member"], "res-policy": ["LoanPolicy"], "res-facade": ["LibraryService"] });
    const s = scoreBoard(b, rubric, "base");
    expect(s.score).toBe(1);
    expect(s.results.every((r) => r.status === "ok")).toBe(true);
    expect(scoreBoard(b, rubric, "storm1").score).toBeCloseTo(4 / 5);
  });

  it("flags missing, misplaced and duplicate ownership with partial credit rules", () => {
    const b = libraryBoard({ "res-catalog": ["Widget"], "res-members": ["Member", "Catalog"], "res-policy": ["Catalog", "Widget"] });
    const byId = Object.fromEntries(scoreBoard(b, rubric, "base").results.map((r) => [r.id, r]));
    expect(byId["res-catalog"].status).toBe("misplaced");
    expect(byId["res-members"].status).toBe("duplicate");
    expect(byId["res-members"].credit).toBe(0.5);
    expect(byId["res-policy"].credit).toBe(0); // duplicate with no valid owner
    expect(byId["res-facade"].status).toBe("missing");
    expect(scoreBoard(b, rubric, "base").score).toBeCloseTo(0.5 / 4);
  });

  it("matches owners case-insensitively and flags overloaded classes and missing extension points", () => {
    const b = libraryBoard({ "res-catalog": ["Catalog"], "res-members": ["Catalog"], "res-policy": ["Catalog"], "res-facade": ["Catalog"], "res-tier": ["Catalog"] });
    const s = scoreBoard(b, rubric, "storm1");
    expect(s.overloaded).toEqual([{ name: "Catalog", count: 5 }]);
    expect(s.notes.some((n) => /extension point/.test(n))).toBe(true);
    expect(s.notes.some((n) => /not connected/.test(n))).toBe(true);
  });

  it("an empty rubric scores 0 without dividing by zero", () => {
    expect(scoreBoard(emptyBoard(), [], "base").score).toBe(0);
  });
});

describe("C++ skeleton export", () => {
  it("maps relationships to ownership-correct members and override", () => {
    const { board, ids } = parking();
    const withImpl = must(addRelation(board, "implements", ids.CompactSpot, ids.FeePolicy)).board;
    const files = Object.fromEntries(exportSkeleton(withImpl).map((f) => [f.path, f.content]));
    expect(Object.keys(files).sort()).toEqual(["compact_spot.h", "fee_policy.h", "parking_lot.h", "spot.h", "ticket.h", "vehicle.h"]);
    expect(files["parking_lot.h"]).toContain("std::vector<std::unique_ptr<Spot>> spots_;");
    expect(files["parking_lot.h"]).toContain("FeePolicy* feePolicy_;");
    expect(files["parking_lot.h"]).toContain("std::vector<Ticket*> tickets_;");
    expect(files["fee_policy.h"]).toContain("virtual long long feeFor(int minutes) const = 0;");
    expect(files["fee_policy.h"]).toContain("virtual ~FeePolicy() = default;");
    expect(files["compact_spot.h"]).toContain("class CompactSpot : public Spot, public FeePolicy");
    expect(files["spot.h"]).toContain("virtual ~Spot() = default;");
  });

  it("compiles with g++ (syntax only) when all headers are included together", () => {
    const { board, ids } = parking();
    const b = must(addRelation(board, "implements", ids.CompactSpot, ids.FeePolicy)).board;
    const dir = mkdtempSync(join(tmpdir(), "bp-skel-"));
    const files = exportSkeleton(b);
    for (const f of files) writeFileSync(join(dir, f.path), f.content);
    writeFileSync(join(dir, "main.cpp"), files.map((f) => `#include "${f.path}"`).join("\n") + "\nint main() {}\n");
    expect(() => execFileSync("g++", ["-std=c++17", "-fsyntax-only", "-Wall", "-Wextra", "-Werror", join(dir, "main.cpp")], { stdio: "pipe" })).not.toThrow();
    // Each header must also stand alone.
    for (const f of files) {
      writeFileSync(join(dir, "one.cpp"), `#include "${f.path}"\n`);
      expect(() => execFileSync("g++", ["-std=c++17", "-fsyntax-only", join(dir, "one.cpp")], { stdio: "pipe" }), f.path).not.toThrow();
    }
  });
});
