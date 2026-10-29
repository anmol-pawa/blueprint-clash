import { describe, expect, it } from "vitest";
import { SPRITES } from "@/game/sprites";
import { bounds, mirror, overlay, shift, validateSprite } from "@/game/sprites/pixel";

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
      it("has attack, hurt and faint animations, and faint ends lower or sparser", () => {
        for (const a of ["attack", "hurt", "faint"]) expect(s.anims[a]?.length ?? 0).toBeGreaterThan(0);
        const opaque = (f: readonly string[]) => f.join("").replace(/\./g, "").length;
        const first = s.anims.faint[0];
        const last = s.anims.faint[s.anims.faint.length - 1];
        expect(bounds(last)!.y > bounds(first)!.y || opaque(last) < opaque(first)).toBe(true);
      });
      it("idle frames actually differ (it animates)", () => {
        expect(new Set(s.anims.idle.map((f) => f.join("\n"))).size).toBeGreaterThan(1);
      });
    });
  }
});

describe("creature roster", () => {
  it("the starter has a front and a back sprite", () => {
    const ids = SPRITES.map((s) => s.id);
    expect(ids).toContain("draftling");
    expect(ids).toContain("draftling-back");
  });
  it("the starter has an evolve animation of at least 6 frames", () => {
    expect(SPRITES.find((s) => s.id === "draftling")!.anims.evolve.length).toBeGreaterThanOrEqual(6);
  });
});

describe("pixel helpers", () => {
  it("mirror flips rows, shift moves pixels and overlay keeps base under transparency", () => {
    expect(mirror(["ab."])).toEqual([".ba"]);
    expect(shift(["a.", ".."], 1, 1)).toEqual(["..", ".a"]);
    expect(overlay(["aaa"], [".b."])).toEqual(["aba"]);
  });
});
