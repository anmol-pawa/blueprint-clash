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
  it("has 12 puzzles with unique ids", () => {
    expect(RACE_PUZZLES).toHaveLength(12);
    expect(new Set(RACE_PUZZLES.map((p) => p.id)).size).toBe(12);
  });
  it("the first finding of each buggy variant is the kind the puzzle teaches", () => {
    const kind = (puzzle: string, variant: string) => {
      const v = RACE_PUZZLES.find((p) => p.id === puzzle)?.variants.find((x) => x.id === variant);
      return explore((v as NonNullable<typeof v>).build()).findings[0].violation.kind;
    };
    expect(kind("aba-stack", "bare")).toBe("invariant");
    expect(kind("bounded-queue", "one-cv-notify-one")).toBe("lost-wakeup");
    expect(kind("reader-writer", "reader-skips-lock")).toBe("data-race");
    expect(kind("reader-writer", "split-sections")).toBe("invariant");
    expect(kind("double-checked-locking", "plain-pointer")).toBe("data-race");
    expect(kind("double-checked-locking", "relaxed-reordered")).toBe("assertion");
    expect(kind("flag-publication", "relaxed-reordered")).toBe("assertion");
    expect(kind("polite-livelock", "retry-immediately")).toBe("livelock");
  });
  it("describeInstr falls back to a plain description and prefers authored C++", () => {
    expect(describeInstr({ op: "lock", m: "a" })).toBe("a.lock();");
    expect(describeInstr({ op: "set", reg: "r", value: { reg: "r", add: 1 } })).toBe("r = r + 1;");
    const p = RACE_PUZZLES[0].variants[0].build();
    expect(renderCpp(p, 0)).toContain("int r = counter;");
    expect(describeInstr(p.threads[0].code[0])).toBe("int r = counter;");
  });
});
