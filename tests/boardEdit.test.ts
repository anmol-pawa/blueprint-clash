import { describe, expect, it } from "vitest";
import { addClass, addEdge, addField, addMethod, classHeight, edgeAnchor, ensureLayout, removeClass, removeMethod, setKind, toggleResponsibility, uniqueName, CLASS_W, EMPTY_BOARD, type Board } from "@/lib/board";

const m = { name: "run", returns: "void", params: "", isConst: false, isAbstract: false };

describe("board edit ops", () => {
  it("gives new classes unique names", () => {
    let b = addClass(EMPTY_BOARD, "class", "a", "Lot");
    b = addClass(b, "class", "b", "Lot");
    expect(b.classes.map((c) => c.name)).toEqual(["Lot", "Lot2"]);
    expect(uniqueName(b, "Lot")).toBe("Lot3");
  });
  it("removing a class removes its edges", () => {
    let b = addClass(addClass(EMPTY_BOARD, "class", "a", "A"), "interface", "b", "IB");
    b = addEdge(b, "a", "b", "implements", "e1");
    expect(removeClass(b, "b").edges).toHaveLength(0);
  });
  it("addEdge ignores duplicates and dangling ends, and defaults ownership multiplicities", () => {
    let b = addClass(addClass(EMPTY_BOARD, "class", "a", "A"), "class", "b", "B");
    b = addEdge(b, "a", "b", "composition", "e1");
    expect(addEdge(b, "a", "b", "composition", "e2")).toBe(b);
    expect(addEdge(b, "a", "zzz", "dependency", "e3")).toBe(b);
    expect(b.edges[0]).toMatchObject({ fromMult: "1", toMult: "*" });
  });
  it("interface methods are forced pure virtual, also after a kind change", () => {
    let b = addClass(EMPTY_BOARD, "interface", "i", "IThing");
    b = addMethod(b, "i", m);
    expect(b.classes[0].methods[0].isAbstract).toBe(true);
    let c = addMethod(addClass(EMPTY_BOARD, "class", "c", "C"), "c", m);
    c = setKind(c, "c", "interface");
    expect(c.classes[0].methods[0].isAbstract).toBe(true);
  });
  it("toggles responsibilities and removes members by index", () => {
    let b = addClass(EMPTY_BOARD, "class", "a", "A");
    b = toggleResponsibility(b, "a", "r1");
    expect(b.classes[0].responsibilities).toEqual(["r1"]);
    b = toggleResponsibility(b, "a", "r1");
    expect(b.classes[0].responsibilities).toEqual([]);
    b = removeMethod(addMethod(addField(b, "a", { name: "x", type: "int" }), "a", m), "a", 0);
    expect(b.classes[0].methods).toHaveLength(0);
    expect(b.classes[0].fields).toHaveLength(1);
  });
  it("lays out new classes without overlap and keeps existing positions", () => {
    let b: Board = EMPTY_BOARD;
    for (let i = 0; i < 7; i++) b = addClass(b, "class", `c${i}`, `C${i}`);
    const first = ensureLayout(b, { c0: { x: 500, y: 500 } });
    expect(first.c0).toEqual({ x: 500, y: 500 });
    const L = ensureLayout(b, {});
    const rects = b.classes.map((c) => ({ ...L[c.id], h: classHeight(c) }));
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], z = rects[j];
        const overlap = a.x < z.x + CLASS_W && z.x < a.x + CLASS_W && a.y < z.y + z.h && z.y < a.y + a.h;
        expect(overlap).toBe(false);
      }
  });
  it("edge anchors sit on the box border", () => {
    const p = edgeAnchor({ x: 0, y: 0 }, 100, { x: 400, y: 0 }, 100);
    expect(p.x).toBeCloseTo(CLASS_W);
    expect(p.y).toBeCloseTo(50);
  });
});
