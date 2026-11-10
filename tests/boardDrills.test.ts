import { describe, expect, it } from "vitest";
import { BOARD_DRILLS } from "@/content/drills";
import { godVariant, misplaceVariant } from "@/content/drills/types";
import { scoreBoard, validateBoard, findInheritanceCycle } from "@/lib/board";

describe.each(BOARD_DRILLS)("board drill $id", (d) => {
  it("has a sound reference board that earns full marks with no flags", () => {
    expect(validateBoard(d.reference).filter((i) => i.severity === "error")).toEqual([]);
    expect(findInheritanceCycle(d.reference)).toBeNull();
    const s = scoreBoard(d.reference, d.rubric, "base");
    expect(s.flags).toEqual([]);
    expect(s.results.every((r) => r.verdict === "ok")).toBe(true);
    expect(s.score).toBe(1);
  });
  it("tags every rubric responsibility exactly once, on a permitted owner", () => {
    for (const r of d.rubric) {
      const owners = d.reference.classes.filter((c) => c.responsibilities.includes(r.id));
      expect(owners, r.id).toHaveLength(1);
      expect(r.owners).toContain(owners[0].name);
    }
    expect(d.reference.classes.some((c) => c.name === d.facade)).toBe(true);
  });
  it("scores the god-class variant lower and flags it", () => {
    const s = scoreBoard(godVariant(d), d.rubric, "base");
    expect(s.score).toBeLessThan(0.7);
    if (d.rubric.length > 4) expect(s.flags.some((f) => f.kind === "god-class")).toBe(true);
  });
  it("scores a misplaced responsibility lower", () => {
    const rid = d.rubric.find((r) => !r.owners.includes(d.facade))!.id;
    const s = scoreBoard(misplaceVariant(d, rid, d.facade), d.rubric, "base");
    expect(s.score).toBeLessThan(1);
    expect(s.results.find((r) => r.id === rid)!.verdict).toBe("misplaced");
  });
  it("states trade-offs and a level signal", () => {
    expect(d.tradeoffs.length).toBeGreaterThanOrEqual(3);
    expect(d.levelSignal).toMatch(/SDE II/);
  });
});
