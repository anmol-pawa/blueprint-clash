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

describe("Race Hunter puzzle bugs are the documented ones", () => {
  const kinds = (puzzle: string, variant: string) => {
    const v = RACE_PUZZLES.find((p) => p.id === puzzle)!.variants.find((x) => x.id === variant)!;
    return explore(v.build(), { collectAll: true }).findings.map((f) => f.violation.kind);
  };
  it("check-then-act with atomics is a race condition, not a data race", () => {
    const k = kinds("check-then-act", "atomic-steps");
    expect(k).toContain("invariant");
    expect(k).not.toContain("data-race");
  });
  it("a forgotten unlock leaks the mutex", () => {
    expect(kinds("forgotten-unlock", "manual")).toContain("lock-leak");
  });
  it("the plain double-checked flag is a data race", () => {
    expect(kinds("double-checked", "plain-flag")).toContain("data-race");
  });
  it("the unlocked producer loses a wake-up or races", () => {
    const k = kinds("missed-wakeup", "unlocked-producer");
    expect(k.includes("lost-wakeup") || k.includes("data-race") || k.includes("deadlock")).toBe(true);
  });
  it("every step of every variant has a displayable C++ line", () => {
    for (const puzzle of RACE_PUZZLES) {
      for (const v of puzzle.variants) {
        const p = v.build();
        p.threads.forEach((t, i) => expect(t.code.every((ins) => describeInstr(ins).length > 0), `${puzzle.id}/${v.id} thread ${i}`).toBe(true));
      }
    }
  });
});
