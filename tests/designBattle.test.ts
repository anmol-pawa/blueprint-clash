import { describe, expect, it } from "vitest";
import { DESIGN_PROBLEMS, MONSTER_HP, START_HEARTS, currentProblem, newParty, pickPatternling, startDesignBattle } from "@/lib/patterns";

const fresh = () => startDesignBattle(newParty());

describe("design battle", () => {
  it("a super pick defeats the monster, recruits and advances", () => {
    const r = pickPatternling(fresh(), "chamelstrat");
    expect(r.matchup.effectiveness).toBe("super");
    expect(r.defeated).toBe(true);
    expect(r.state.index).toBe(1);
    expect(r.state.foeHp).toBe(MONSTER_HP);
    expect(r.state.party.owned).toContain("chamelstrat");
  });
  it("a heavy pick chips the monster without costing a heart", () => {
    const r = pickPatternling(fresh(), "templar");
    expect(r.matchup.effectiveness).toBe("neutral");
    expect(r.damage).toBe(12); // ceil(15 * 0.75)
    expect(r.state.hearts).toBe(START_HEARTS);
    expect(r.state.foeHp).toBe(MONSTER_HP - 12);
    expect(r.state.party.owned).not.toContain("templar");
  });
  it("wrong picks cost hearts until the battle is lost", () => {
    let s = fresh();
    for (let i = 0; i < START_HEARTS; i++) s = pickPatternling(s, "visitorb").state;
    expect(s.phase).toBe("lost");
    expect(currentProblem(s)).toBeNull();
    expect(() => pickPatternling(s, "solo")).toThrow();
  });
  it("clearing every problem wins", () => {
    let s = fresh();
    for (const p of DESIGN_PROBLEMS) s = pickPatternling(s, p.best[0]).state;
    expect(s.phase).toBe("won");
  });
  it("repeated unjustified Solo picks apply the debuff to damage", () => {
    let s = fresh();
    s = pickPatternling(s, "solo").state; // weak: overuse 1
    s = { ...s, hearts: 9, party: { ...s.party, singletonOveruse: 3 } };
    const r = pickPatternling(s, "templar"); // neutral 0.75 * 0.8 = 0.6 -> 9
    expect(r.damage).toBe(9);
  });
  it("rejects unknown patternlings and empty problem lists", () => {
    expect(() => pickPatternling(fresh(), "nope")).toThrow();
    expect(() => startDesignBattle(newParty(), [])).toThrow();
  });
});
