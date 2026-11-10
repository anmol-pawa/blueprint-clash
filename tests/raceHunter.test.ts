import { describe, expect, it } from "vitest";
import { describeInstr, explore, renderCpp } from "@/lib/concurrency";
import { RACE_PUZZLES } from "@/content/race/puzzles";

describe("Race Hunter puzzles", () => {
  for (const puzzle of RACE_PUZZLES) {
    for (const v of puzzle.variants) {
      it(`${puzzle.id}/${v.id}: explorer ${v.correct ? "proves it" : "finds a bug"}`, () => {
        const r = explore(v.build());
        if (v.correct) expect(r.proved).toBe(true);
        else expect(r.findings.length).toBeGreaterThan(0);
      });
    }
    it(`${puzzle.id} has a buggy and a correct variant`, () => {
      expect(puzzle.variants.some((v) => v.correct)).toBe(true);
      expect(puzzle.variants.some((v) => !v.correct)).toBe(true);
    });
  }
  it("describeInstr falls back to a plain description and prefers authored C++", () => {
    expect(describeInstr({ op: "lock", m: "a" })).toBe("a.lock();");
    expect(describeInstr({ op: "set", reg: "r", value: { reg: "r", add: 1 } })).toBe("r = r + 1;");
    const p = RACE_PUZZLES[0].variants[0].build();
    expect(renderCpp(p, 0)).toContain("int r = counter;");
    expect(describeInstr(p.threads[0].code[0])).toBe("int r = counter;");
  });
});
