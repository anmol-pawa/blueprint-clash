import { describe, expect, it } from "vitest";
import { addClass, addEdge, addField, addMethod, boardStorageKey, boardToSkeleton, EMPTY_BOARD, joinSkeleton, parseBoard, serializeBoard } from "@/lib/board";
import { createWorkspace, getFile, insertFiles } from "@/lib/editor/workspace";

const sample = () => {
  let b = addClass(addClass(EMPTY_BOARD, "interface", "i", "IPricing"), "class", "c", "Lot");
  b = addMethod(b, "i", { name: "price", returns: "int", params: "int hours", isConst: true, isAbstract: true });
  b = addField(b, "c", { name: "capacity", type: "int" });
  return addEdge(b, "c", "i", "composition", "e1");
};

describe("board persistence", () => {
  it("round-trips a board", () => {
    const b = sample();
    expect(parseBoard(serializeBoard(b))).toEqual(b);
  });
  it("rejects junk and malformed boards without throwing", () => {
    for (const raw of [null, "", "{", "[]", '{"board":{"classes":[{"id":1}],"edges":[]}}', '{"board":{"classes":[],"edges":[{"id":"e"}]}}']) expect(parseBoard(raw)).toBeNull();
  });
  it("drops edges whose class vanished instead of rejecting the draft", () => {
    const raw = JSON.parse(serializeBoard(sample()));
    raw.board.edges.push({ id: "x", from: "c", to: "gone", kind: "dependency" });
    expect(parseBoard(JSON.stringify(raw))?.edges).toHaveLength(1);
  });
  it("keys per problem", () => {
    expect(boardStorageKey("a")).not.toBe(boardStorageKey("b"));
  });
  it("joins the skeleton with file banners", () => {
    const text = joinSkeleton(boardToSkeleton(sample()));
    expect(text).toContain("// ===== IPricing.h =====");
    expect(text).toContain("// ===== Lot.h =====");
  });
});

describe("insertFiles", () => {
  it("adds new files and never overwrites existing ones", () => {
    const ws = createWorkspace([], [{ path: "Lot.h", content: "mine" }]);
    const r = insertFiles(ws, boardToSkeleton(sample()));
    expect(r.added).toEqual(["IPricing.h"]);
    expect(r.skipped).toEqual(["Lot.h"]);
    expect(getFile(r.ws, "Lot.h")?.content).toBe("mine");
    expect(getFile(r.ws, "IPricing.h")?.content).toContain("class IPricing");
  });
});
