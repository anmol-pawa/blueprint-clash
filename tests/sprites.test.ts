import { describe, expect, it } from "vitest";
import { PixelBuffer, fillEllipsoid, outline, toRgba } from "@/lib/sprites/buffer";
import { C, DRAFTLING_PALETTE, REST, SIZE, drawDraftling } from "@/lib/sprites/draftling";
import { DRAFTLING_ANIMATIONS, drawFrame } from "@/lib/sprites/animations";

const same = (a: PixelBuffer, b: PixelBuffer) => a.px.every((v, i) => v === b.px[i]);

describe("pixel buffer", () => {
  it("outlines only transparent pixels next to the shape", () => {
    const b = new PixelBuffer(9, 9);
    b.set(4, 4, 5);
    outline(b, 1);
    expect(b.opaqueCount()).toBe(5);
    expect(b.get(3, 3)).toBe(0);
    expect(b.get(4, 3)).toBe(1);
  });

  it("shades an ellipsoid lighter at the top-left than the bottom-right", () => {
    const b = new PixelBuffer(20, 20);
    fillEllipsoid(b, 10, 10, 8, 8, [1, 2, 3, 4]);
    expect(b.get(7, 6)).toBeGreaterThan(b.get(13, 14));
  });

  it("converts to RGBA with transparent index 0", () => {
    const b = new PixelBuffer(2, 1);
    b.set(1, 0, 2);
    const rgba = toRgba(b, ["", "#000000", "#ff8000"]);
    expect(Array.from(rgba)).toEqual([0, 0, 0, 0, 255, 128, 0, 255]);
  });
});

describe("Draftling", () => {
  for (const view of ["front", "back"] as const) {
    it(`${view} is 64x64, in-palette and fits the canvas with an outline`, () => {
      const b = drawDraftling(REST, view);
      expect(b.width).toBe(SIZE);
      expect(b.height).toBe(SIZE);
      expect(Math.max(...b.px)).toBeLessThan(DRAFTLING_PALETTE.length);
      const box = b.bounds()!;
      expect(box.x0).toBeGreaterThan(0);
      expect(box.y0).toBeGreaterThanOrEqual(0);
      expect(box.x1).toBeLessThan(SIZE - 1);
      expect(box.y1).toBeLessThan(SIZE);
      expect(b.opaqueCount()).toBeGreaterThan(1500);
      expect(b.px.includes(C.outline)).toBe(true);
    });
  }

  it("uses a limited palette", () => {
    const used = new Set(drawDraftling().px);
    used.delete(0);
    expect(used.size).toBeLessThanOrEqual(DRAFTLING_PALETTE.length);
    expect(used.size).toBeGreaterThanOrEqual(14);
  });

  it("front and back views differ, drawing is deterministic", () => {
    expect(same(drawDraftling(REST, "front"), drawDraftling(REST, "back"))).toBe(false);
    expect(same(drawDraftling(), drawDraftling())).toBe(true);
  });

  it("back view shows no face", () => {
    const back = drawDraftling(REST, "back");
    expect(back.px.includes(C.eye)).toBe(false);
    expect(drawDraftling(REST, "front").px.includes(C.eye)).toBe(true);
  });

  it("every animation has distinct frames inside the canvas", () => {
    for (const anim of Object.values(DRAFTLING_ANIMATIONS)) {
      expect(anim.poses.length).toBeGreaterThanOrEqual(3);
      const frames = anim.poses.map((_, i) => drawFrame(anim, i));
      for (let i = 1; i < frames.length; i++) expect(same(frames[i - 1], frames[i]), `${anim.name} ${i}`).toBe(false);
      for (const f of frames) {
        const box = f.bounds();
        if (!box) continue;
        expect(box.x0).toBeGreaterThanOrEqual(0);
        expect(box.x1).toBeLessThan(SIZE);
      }
    }
  });

  it("hurt flash is a white silhouette plus outline", () => {
    const flash = drawFrame(DRAFTLING_ANIMATIONS.hurt, 0);
    const used = new Set(flash.px);
    used.delete(0);
    expect([...used].sort()).toEqual([C.outline, C.flash]);
  });

  it("faint sinks below the ground line", () => {
    const first = drawFrame(DRAFTLING_ANIMATIONS.faint, 0).bounds()!;
    const last = drawFrame(DRAFTLING_ANIMATIONS.faint, 3).bounds()!;
    expect(last.y0).toBeGreaterThan(first.y0 + 15);
    expect(last.y1).toBeLessThanOrEqual(61);
  });

  it("frame lookup wraps around", () => {
    const idle = DRAFTLING_ANIMATIONS.idle;
    expect(same(drawFrame(idle, idle.poses.length), drawFrame(idle, 0))).toBe(true);
  });
});
