import { describe, expect, it } from "vitest";
import { EVOLUTION, EVOLUTION_TOTAL, evolutionFrame, evolutionText, flickerPhase } from "@/lib/battle/evolution";
import { ARCHITECT } from "@/game/sprites/creatures/architect";
import { DRAFTLING } from "@/game/sprites/creatures/draftling";

describe("evolution timeline", () => {
  it("starts on the old form and ends on the new one", () => {
    expect(evolutionFrame(0)).toMatchObject({ beat: "announce", form: "from", white: 0, done: false });
    expect(evolutionFrame(EVOLUTION_TOTAL)).toMatchObject({ beat: "reveal", form: "to", white: 0, done: true });
  });

  it("visits the beats in order", () => {
    const seen: string[] = [];
    for (let t = 0; t <= EVOLUTION_TOTAL; t += 0.02) {
      const b = evolutionFrame(t).beat;
      if (seen[seen.length - 1] !== b) seen.push(b);
    }
    expect(seen).toEqual(["announce", "morph", "burst", "reveal"]);
  });

  it("flickers between forms faster and faster during the morph", () => {
    const flips = (from: number, to: number) => {
      let n = 0;
      let last = evolutionFrame(from).form;
      for (let t = from; t < to; t += 0.005) {
        const f = evolutionFrame(t).form;
        if (f !== last) n++;
        last = f;
      }
      return n;
    };
    const s = EVOLUTION.announce;
    const third = EVOLUTION.morph / 3;
    expect(flips(s, s + third)).toBeLessThan(flips(s + 2 * third, s + 3 * third - 0.001));
    expect(flickerPhase(1)).toBeGreaterThan(flickerPhase(0.5));
  });

  it("is a silhouette during the morph and white-out peaks at the burst", () => {
    const mid = evolutionFrame(EVOLUTION.announce + EVOLUTION.morph / 2);
    expect(mid.white).toBeGreaterThan(0.5);
    expect(evolutionFrame(EVOLUTION.announce + EVOLUTION.morph + 0.01).white).toBe(1);
  });

  it("clamps negative time and produces text for every beat", () => {
    expect(evolutionFrame(-5).beat).toBe("announce");
    for (const b of ["announce", "morph", "burst", "reveal"] as const) expect(evolutionText(b, "A", "B").length).toBeGreaterThan(0);
    expect(evolutionText("reveal", "DRAFTLING", "ARCHITECT")).toBe("DRAFTLING evolved into ARCHITECT!");
  });

  it("has both forms with evolve animations available", () => {
    expect(DRAFTLING.anims.idle.length).toBeGreaterThan(1);
    expect(ARCHITECT.anims.evolve?.length).toBeGreaterThan(0);
  });
});
