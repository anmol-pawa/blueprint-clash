import { describe, expect, it } from "vitest";
import { DRAFTLING_PALETTE, draftlingFrames, type DraftlingAnim } from "@/lib/sprites/draftling";
import { frameToRgba, type Frame } from "@/lib/sprites/raster";

const ANIMS: DraftlingAnim[] = ["idle", "attack", "hurt", "faint", "evolve"];
const count = (f: Frame) => f.px.filter(Boolean).length;
const same = (a: Frame, b: Frame) => a.px.every((v, i) => v === b.px[i]);

describe("Draftling sprites", () => {
  it("renders 64x64 frames with only palette indices", () => {
    for (const view of ["front", "back"] as const) {
      for (const a of ANIMS) {
        for (const f of draftlingFrames(a, view)) {
          expect([f.w, f.h]).toEqual([64, 64]);
          expect(Math.max(...f.px)).toBeLessThan(DRAFTLING_PALETTE.length);
          expect(count(f)).toBeGreaterThan(a === "faint" ? 100 : 700);
        }
      }
    }
  });

  it("keeps the creature fully inside the frame", () => {
    for (const a of ANIMS) {
      for (const f of draftlingFrames(a, "front")) {
        for (let i = 0; i < 64; i++) {
          for (const [x, y] of [[i, 0], [i, 63], [0, i], [63, i]]) expect(f.px[y * 64 + x], `${a} ${x},${y}`).toBe(0);
        }
      }
    }
  });

  it("is deterministic and every animation has distinct frames", () => {
    expect(same(draftlingFrames("idle", "front")[0], draftlingFrames("idle", "front")[0])).toBe(true);
    for (const a of ANIMS) {
      const fr = draftlingFrames(a, "front");
      expect(fr.length).toBeGreaterThanOrEqual(3);
      expect(fr.slice(1).some((f) => !same(f, fr[0]))).toBe(true);
    }
  });

  it("front and back views differ and the faint animation dissolves", () => {
    expect(same(draftlingFrames("idle", "front")[0], draftlingFrames("idle", "back")[0])).toBe(false);
    const faint = draftlingFrames("faint", "front");
    expect(count(faint[3])).toBeLessThan(count(faint[0]) / 2);
  });

  it("converts to RGBA with transparent background", () => {
    const f = draftlingFrames("idle", "front")[0];
    const rgba = frameToRgba(f, DRAFTLING_PALETTE);
    expect(rgba[3]).toBe(0);
    expect(rgba.filter((_, i) => i % 4 === 3 && rgba[i] === 255).length).toBe(count(f));
  });
});
