import { describe, expect, it } from "vitest";
import { PATTERNLINGS, patternlingById, DESIGN_PROBLEMS, matchup, problemById, YAGNI_FACTOR, newParty, recordPick, hasGlobalStateDebuff, effectiveMultiplier, levelFromMastery, stageForLevel, recruit } from "@/lib/patterns";

describe("roster", () => {
  it("has 21 unique Patternlings with full text", () => {
    expect(PATTERNLINGS).toHaveLength(21);
    expect(new Set(PATTERNLINGS.map((p) => p.id)).size).toBe(21);
    for (const p of PATTERNLINGS) {
      expect(p.solves.length).toBeGreaterThan(15);
      expect(p.cost.length).toBeGreaterThan(15);
    }
  });
  it("splits 4 creational, 7 structural, 10 behavioural creatures", () => {
    const n = (f: string) => PATTERNLINGS.filter((p) => p.family === f).length;
    expect([n("creational"), n("structural"), n("behavioural")]).toEqual([4, 7, 10]);
  });
});

describe("type chart", () => {
  it("only references known Patternlings and has a super fit for every problem", () => {
    for (const pr of DESIGN_PROBLEMS) {
      expect(pr.best.length).toBeGreaterThan(0);
      for (const id of [...pr.best, ...pr.heavy, ...Object.keys(pr.failure).filter((k) => k !== "default")]) expect(patternlingById(id)).toBeDefined();
      expect(pr.best.filter((b) => pr.heavy.includes(b))).toEqual([]);
    }
  });
  it("scores super, heavy-neutral and weak picks", () => {
    const pr = problemById("switch-on-type")!;
    expect(matchup(pr, "chamelstrat")).toMatchObject({ effectiveness: "super", multiplier: 2 });
    expect(matchup(pr, "templar")).toMatchObject({ effectiveness: "neutral", multiplier: YAGNI_FACTOR });
    expect(matchup(pr, "solo")).toMatchObject({ effectiveness: "weak", multiplier: 0.5 });
    expect(matchup(pr, "solo").explanation).toContain("single instance");
    expect(matchup(pr, "flytile").explanation).toContain("type switch");
  });
  it("rejects unknown ids", () => {
    expect(() => matchup(DESIGN_PROBLEMS[0], "nope")).toThrow();
  });
});

describe("party and Global State debuff", () => {
  const sw = problemById("switch-on-type")!;
  const lone = problemById("global-hoard")!;
  it("legit Solo use does not count as overuse", () => {
    const p = recordPick(newParty(), "solo", matchup(lone, "solo"));
    expect(p.singletonOveruse).toBe(0);
  });
  it("three unjustified Solo picks trigger the debuff, a super pick heals one", () => {
    let p = newParty();
    for (let i = 0; i < 3; i++) p = recordPick(p, "solo", matchup(sw, "solo"));
    expect(hasGlobalStateDebuff(p)).toBe(true);
    expect(effectiveMultiplier(p, matchup(sw, "templar"))).toBeCloseTo(YAGNI_FACTOR * 0.8);
    expect(effectiveMultiplier(p, matchup(sw, "chamelstrat"))).toBe(2);
    p = recordPick(p, "chamelstrat", matchup(sw, "chamelstrat"));
    expect(hasGlobalStateDebuff(p)).toBe(false);
  });
  it("overuse never goes below zero", () => {
    expect(recordPick(newParty(), "chamelstrat", matchup(sw, "chamelstrat")).singletonOveruse).toBe(0);
  });
  it("levels and stages follow mastery", () => {
    expect(levelFromMastery(0)).toBe(1);
    expect(levelFromMastery(9)).toBe(1);
    expect(levelFromMastery(10)).toBe(2);
    expect(levelFromMastery(30)).toBe(3);
    expect(levelFromMastery(1e9)).toBe(30);
    expect([stageForLevel(9), stageForLevel(10), stageForLevel(20)]).toEqual([1, 2, 3]);
  });
  it("recruit is idempotent", () => {
    expect(recruit(recruit(newParty(), "solo"), "solo").owned).toEqual(["solo"]);
  });
});
