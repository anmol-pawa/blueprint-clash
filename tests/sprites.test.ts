import { describe, expect, it } from "vitest";
import { SPRITES } from "@/game/sprites";
import { PORTRAITS, WALKERS } from "@/game/sprites/characters";
import { bounds, frameToRGBA, mirror, shift, validateSprite } from "@/game/sprites/pixel";

describe("sprite library", () => {
  it("has unique ids", () => {
    expect(new Set(SPRITES.map((s) => s.id)).size).toBe(SPRITES.length);
  });

  for (const s of SPRITES) {
    describe(s.id, () => {
      it("is rectangular, uses only palette keys and has a 2–4 frame idle", () => {
        expect(validateSprite(s)).toEqual([]);
      });
      it("is at least 64×64 and not empty", () => {
        expect(s.w).toBeGreaterThanOrEqual(64);
        expect(s.h).toBeGreaterThanOrEqual(64);
        for (const frames of Object.values(s.anims)) for (const f of frames) expect(bounds(f)).not.toBeNull();
      });
      it("uses a limited palette", () => {
        expect(Object.keys(s.palette).length).toBeLessThanOrEqual(24);
      });
      it("has attack, hurt, faint and evolve animations; faint ends sparser", () => {
        for (const a of ["attack", "hurt", "faint", "evolve"]) expect(s.anims[a]?.length ?? 0).toBeGreaterThan(0);
        const opaque = (f: readonly string[]) => f.join("").replace(/\./g, "").length;
        expect(opaque(s.anims.faint[s.anims.faint.length - 1])).toBeLessThan(opaque(s.anims.faint[0]));
      });
      it("idle frames actually differ (it animates)", () => {
        expect(new Set(s.anims.idle.map((f) => f.join("\n"))).size).toBeGreaterThan(1);
      });
    });
  }
});

describe("pixel helpers", () => {
  const def = { id: "t", name: "T", w: 2, h: 2, palette: { a: "#ff0000" }, anims: { idle: [["a.", ".."], [".a", ".."]] } };
  it("converts frames to RGBA with transparency", () => {
    const px = frameToRGBA(def, def.anims.idle[0]);
    expect([...px.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect(px[7]).toBe(0);
  });
  it("mirrors and shifts", () => {
    expect(mirror(["a."])).toEqual([".a"]);
    expect(shift(["a.", ".."], 1, 1)).toEqual(["..", ".a"]);
  });
  it("rejects bad sprites", () => {
    expect(validateSprite({ ...def, anims: { idle: [["a."], ["a."]] } }).length).toBeGreaterThan(0);
    expect(validateSprite({ ...def, anims: { idle: [["a.", ".."], ["b.", ".."]] } }).length).toBeGreaterThan(0);
  });
});

describe("character sprites", () => {
  for (const s of WALKERS) {
    describe(`${s.id} walker`, () => {
      it("is valid, 24×32 and non-empty", () => {
        expect(validateSprite(s)).toEqual([]);
        expect([s.w, s.h]).toEqual([24, 32]);
        for (const frames of Object.values(s.anims)) for (const f of frames) expect(bounds(f)).not.toBeNull();
      });
      it("has 4-frame walk cycles in three directions whose frames all differ", () => {
        for (const a of ["walk-down", "walk-up", "walk-right"]) {
          expect(s.anims[a]).toHaveLength(4);
          expect(new Set(s.anims[a].map((f) => f.join("\n"))).size).toBeGreaterThanOrEqual(3);
        }
      });
      it("keeps feet on the ground line in every walk frame", () => {
        for (const a of ["walk-down", "walk-up", "walk-right"])
          for (const f of s.anims[a]) {
            const b = bounds(f)!;
            expect(b.y + b.h).toBeGreaterThanOrEqual(30);
            expect(b.y + b.h).toBeLessThanOrEqual(32);
          }
      });
    });
  }
  for (const s of PORTRAITS) {
    describe(`${s.id}`, () => {
      it("is valid, 48×48 with idle blink and talk frames", () => {
        expect(validateSprite(s)).toEqual([]);
        expect([s.w, s.h]).toEqual([48, 48]);
        expect(new Set(s.anims.idle.map((f) => f.join("\n"))).size).toBeGreaterThan(1);
        expect(new Set(s.anims.talk.map((f) => f.join("\n"))).size).toBe(2);
      });
    });
  }
});

describe("hue shifting", () => {
  it("keeps grey and lightness, changes hue", async () => {
    const { rotateHue } = await import("@/game/sprites/pixel");
    expect(rotateHue([120, 120, 120], 90)).toEqual([120, 120, 120]);
    expect(rotateHue([255, 0, 0], 120)).toEqual([0, 255, 0]);
    expect(rotateHue([255, 0, 0], 360)).toEqual([255, 0, 0]);
  });
});
