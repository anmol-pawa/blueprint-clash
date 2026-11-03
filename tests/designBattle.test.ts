import { describe, expect, it } from "vitest";
import { START_HEARTS, pick, startBattle } from "@/lib/patterns/battle";
import { newParty, starterParty } from "@/lib/patterns/party";

describe("design battle", () => {
  it("a super pick wins the fight, recruits the Patternling and raises mastery", () => {
    const o = pick(startBattle("mode-switch"), starterParty(), "shapeshift");
    expect(o.effectiveness).toBe("super");
    expect(o.damage).toBe(80);
    expect(o.recruited).toBe(true);
    expect(o.party.owned).toContain("shapeshift");
    expect(o.party.mastery.shapeshift).toBe(3);
    expect(o.battle.foeHp).toBe(20);
  });
  it("weak picks cost hearts until the battle is lost", () => {
    let b = startBattle("mode-switch");
    let p = newParty();
    for (const id of ["forgebot", "axolink", "beaverbuild"]) {
      const o = pick(b, p, id);
      expect(o.effectiveness).toBe("weak");
      b = o.battle;
      p = o.party;
    }
    expect(b.hearts).toBe(START_HEARTS - 3);
    expect(b.status).toBe("lost");
    expect(() => pick(b, p, "solo")).toThrow(/over/);
  });
  it("heavy picks are neutral with the YAGNI factor; the same pick cannot repeat", () => {
    const o = pick(startBattle("mode-switch"), newParty(), "chamelstrat");
    expect(o.effectiveness).toBe("neutral");
    expect(o.damage).toBe(30);
    expect(() => pick(o.battle, o.party, "chamelstrat")).toThrow(/already/);
  });
  it("Global State debuff trims a neutral hit after three Solo overuses", () => {
    let p = newParty();
    for (let i = 0; i < 3; i++) p = pick(startBattle("switch-on-type"), p, "solo").party;
    const o = pick(startBattle("mode-switch"), p, "chamelstrat");
    expect(o.debuffed).toBe(true);
    expect(o.damage).toBe(24);
  });
  it("two picks can win: super then super-ish", () => {
    const a = pick(startBattle("global-hoard"), starterParty(), "forgebot");
    const b = pick(a.battle, a.party, "solo");
    expect(b.battle.status).toBe("won");
    expect(b.recruited).toBe(false);
  });
  it("rejects unknown problems", () => {
    expect(() => startBattle("nope")).toThrow();
  });
});
