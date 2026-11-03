import { describe, expect, it } from "vitest";
import { initialFlow, phasesOf, reduceFlow, surprises, type FlowEvent, type FlowState } from "@/lib/workshop/flow";
import { lineHunks, ocpScore } from "@/lib/workshop/ocp";
import { clarifyScore, timeScore, workshopScore } from "@/lib/workshop/score";
import { clarify } from "@/content/workshop/library-management/clarify";
import { meta } from "@/content/workshop/library-management/meta";

const f = (path: string, content: string) => ({ path, content });
const run = (s: FlowState, ...events: FlowEvent[]) => events.reduce((acc, e) => reduceFlow(acc, e, clarify), s);

describe("ocpScore", () => {
  it("scores 1 for a pure extension (new file, appended lines)", () => {
    const before = [f("a.h", "int a;\nint b;\n")];
    const after = [f("a.h", "int a;\nint b;\nint c;\n"), f("new.h", "x\ny\n")];
    const r = ocpScore(before, after);
    expect(r).toMatchObject({ added: 3, touched: 0, score: 1, changed: true });
  });
  it("counts a modified line once as touched, not as added", () => {
    const r = ocpScore([f("a.cpp", "one\ntwo\nthree\n")], [f("a.cpp", "one\nTWO\nthree\n")]);
    expect(r).toMatchObject({ added: 0, touched: 1, score: 0 });
  });
  it("counts surplus insertions in a hunk as added and the replaced line as touched", () => {
    const r = ocpScore([f("a.cpp", "one\ntwo\nthree\n")], [f("a.cpp", "one\nTWO\nextra\nthree\n")]);
    expect(r).toMatchObject({ added: 1, touched: 1, score: 0.5 });
  });
  it("counts every line of a deleted file as touched", () => {
    const r = ocpScore([f("a.cpp", "1\n2\n3\n")], []);
    expect(r).toMatchObject({ added: 0, touched: 3, score: 0 });
    expect(r.perFile[0].status).toBe("deleted");
  });
  it("ignores blank lines and indentation", () => {
    const r = ocpScore([f("a.cpp", "int  x;\n\n  return;\n")], [f("a.cpp", "int x;\nreturn;\n")]);
    expect(r.changed).toBe(false);
    expect(r.score).toBe(1);
  });
  it("lineHunks groups changes between common lines", () => {
    expect(lineHunks(["a", "b", "c", "d"], ["a", "x", "y", "c"])).toEqual([
      { removed: 1, inserted: 2 },
      { removed: 1, inserted: 0 },
    ]);
  });
  it("a refactor that rewrites the borrow flow scores below the 0.7 star bar", () => {
    const before = [f("lib.cpp", Array.from({ length: 20 }, (_, i) => `line${i};`).join("\n"))];
    const rewritten = before[0].content.split("\n").map((l, i) => (i % 2 ? `${l} // changed` : l)).join("\n");
    const r = ocpScore(before, [f("lib.cpp", rewritten), f("tier.h", "a\nb\nc")]);
    expect(r.score).toBeLessThan(0.7);
  });
});

describe("clarifyScore", () => {
  const ids = (quality: string) => clarify.filter((q) => q.quality === quality).map((q) => q.id);
  it("rewards asking every essential question, including the one that reveals the storm", () => {
    const r = clarifyScore(clarify, ids("essential"));
    expect(r.essentialAsked).toBe(r.essentialTotal);
    expect(r.missedEssential).toEqual([]);
    expect(r.score).toBeCloseTo(0.8);
  });
  it("lists the essential questions you missed and penalises noise", () => {
    const r = clarifyScore(clarify, [...ids("noise"), "q-limit"]);
    expect(r.missedEssential).toContain("q-tiers");
    expect(r.noiseAsked).toBe(ids("noise").length);
    expect(r.score).toBe(0);
  });
  it("is capped at 1 when everything useful is asked", () => {
    expect(clarifyScore(clarify, clarify.filter((q) => q.quality !== "noise").map((q) => q.id)).score).toBe(1);
  });
});

describe("surprises", () => {
  it("flags the tier requirement when the tier question was never asked", () => {
    expect(surprises(meta.requirements, clarify, ["q-limit"], "storm1").map((r) => r.id)).toEqual(["R-tier"]);
    expect(surprises(meta.requirements, clarify, ["q-tiers"], "storm1")).toEqual([]);
  });
});

describe("timeScore", () => {
  it("is 1 within par, linear to 0 at twice par", () => {
    expect(timeScore(30, 60)).toBe(1);
    expect(timeScore(90, 60)).toBeCloseTo(0.5);
    expect(timeScore(200, 60)).toBe(0);
  });
});

describe("flow state machine", () => {
  const phases = phasesOf({ base: [], storm1: [] });
  it("rejects bad phase lists", () => {
    expect(() => initialFlow([])).toThrow();
    expect(() => initialFlow(["storm1"])).toThrow();
  });
  it("ignores illegal events (same state object)", () => {
    const s = initialFlow(phases);
    expect(reduceFlow(s, { type: "ASK", questionId: "q-limit" }, clarify)).toBe(s);
    expect(reduceFlow(s, { type: "BEGIN_CODING" })).toBe(s);
    const c = run(s, { type: "START", nowMs: 0 });
    expect(reduceFlow(c, { type: "ASK", questionId: "nope" }, clarify)).toBe(c);
    expect(reduceFlow(c, { type: "LOCK", files: [], nowMs: 1 })).toBe(c);
    const coding = run(c, { type: "BEGIN_CODING" });
    expect(reduceFlow(coding, { type: "LOCK", files: [], nowMs: 1 })).toBe(coding); // must submit first
    expect(reduceFlow(coding, { type: "ASK", questionId: "q-limit" }, clarify)).toBe(coding); // no re-briefing
  });
  it("does not double-count a repeated question", () => {
    const s = run(initialFlow(phases), { type: "START", nowMs: 0 }, { type: "ASK", questionId: "q-limit" }, { type: "ASK", questionId: "q-limit" });
    expect(s.asked).toEqual(["q-limit"]);
  });

  function play(baseResult: [number, number], stormResult: [number, number], stormFiles: ReturnType<typeof f>[]) {
    const s = run(
      initialFlow(phases),
      { type: "START", nowMs: 0 },
      { type: "ASK", questionId: "q-tiers" },
      { type: "BEGIN_CODING" },
      { type: "SUBMIT", result: { passed: 3, total: baseResult[1] } },
      { type: "SUBMIT", result: { passed: baseResult[0], total: baseResult[1] } },
      { type: "LOCK", files: [f("lib.cpp", "a\nb\nc\nd\n")], nowMs: 20 * 60000 },
    );
    expect(s.stage).toBe("storm");
    expect(s.phase).toBe("storm1");
    expect(s.records.base.best).toEqual({ passed: baseResult[0], total: baseResult[1] });
    return run(
      s,
      { type: "ACCEPT_STORM" },
      { type: "SUBMIT", result: { passed: stormResult[0], total: stormResult[1] } },
      { type: "LOCK", files: stormFiles, nowMs: 40 * 60000 },
    );
  }

  it("keeps the best attempt per phase and ends in the debrief after the last storm", () => {
    const s = play([8, 8], [5, 5], [f("lib.cpp", "a\nb\nc\nd\n"), f("tier.h", "t1\nt2\n")]);
    expect(s.stage).toBe("debrief");
    expect(s.records.base.attempts).toBe(2);
    expect(s.records.base.best).toEqual({ passed: 8, total: 8 });
  });

  it("awards 2 stars (3 pending a review) for a clean extension, and the score renormalises over missing parts", () => {
    const s = play([8, 8], [5, 5], [f("lib.cpp", "a\nb\nc\nd\n"), f("tier.h", "t1\nt2\n")]);
    const sc = workshopScore({ flow: s, parMinutes: 60 });
    expect(sc.meanOcp).toBe(1);
    expect(sc.stars).toBe(2);
    expect(sc.starThreePending).toBe(true);
    expect(sc.partial).toBe(true);
    expect(sc.total).toBeCloseTo(1);
    const reviewed = workshopScore({ flow: s, parMinutes: 60, reviewBlockingFindings: 0, reviewScore: 1, boardScore: 1 });
    expect(reviewed.stars).toBe(3);
    expect(reviewed.partial).toBe(false);
    const blocked = workshopScore({ flow: s, parMinutes: 60, reviewBlockingFindings: 2, reviewScore: 0.5 });
    expect(blocked.stars).toBe(2);
  });

  it("a storm that is survived only by rewriting the old code earns 2 stars but a low OCP", () => {
    const s = play([8, 8], [5, 5], [f("lib.cpp", "A\nB\nC\nD\n")]);
    const sc = workshopScore({ flow: s, parMinutes: 60 });
    expect(sc.meanOcp).toBe(0);
    expect(sc.stars).toBe(2);
    expect(sc.starThreePending).toBe(false);
  });

  it("gives 1 star for a passing base and a failed storm, 0 for a failing base", () => {
    expect(workshopScore({ flow: play([8, 8], [3, 5], [f("lib.cpp", "a\nb\nc\nd\n")]), parMinutes: 60 }).stars).toBe(1);
    expect(workshopScore({ flow: play([4, 8], [5, 5], [f("lib.cpp", "a\nb\nc\nd\n")]), parMinutes: 60 }).stars).toBe(0);
  });

  it("weights tests 40 %: a half-passing base and nothing else is worth little", () => {
    const sc = workshopScore({ flow: play([4, 8], [0, 5], [f("lib.cpp", "a\nb\nc\nd\n")]), parMinutes: 60 });
    expect(sc.parts.tests).toBe(0.5);
    expect(sc.total).toBeLessThan(0.6);
  });
});

describe("design stage", () => {
  const start = () => reduceFlow(initialFlow(["base", "storm1"]), { type: "START", nowMs: 0 });
  it("goes clarify -> design -> code and keeps the board", () => {
    const d = reduceFlow(start(), { type: "BEGIN_DESIGN" });
    expect(d.stage).toBe("design");
    const board = { classes: [], edges: [] };
    const c = reduceFlow(d, { type: "FINISH_BOARD", board });
    expect(c.stage).toBe("code");
    expect(c.board).toBe(board);
  });
  it("ignores design events in the wrong stage", () => {
    const s = start();
    expect(reduceFlow(s, { type: "FINISH_BOARD", board: null })).toBe(s);
    const brief = initialFlow(["base"]);
    expect(reduceFlow(brief, { type: "BEGIN_DESIGN" })).toBe(brief);
  });
});
