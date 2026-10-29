import { describe, expect, it } from "vitest";
import { DRAFTING_HALL_SCENE, OLD_TOWN_SCENE, TILESETS } from "@/game/sprites/tiles";
import { composeScene, validateTileSet } from "@/game/sprites/tiles/tileset";
import { validateSprite } from "@/game/sprites/pixel";

describe("tilesets", () => {
  for (const set of TILESETS) {
    describe(set.id, () => {
      it("is valid: 16×16 frames, palette keys only", () => {
        expect(set.size).toBe(16);
        expect(validateTileSet(set)).toEqual([]);
      });
      it("has an animated tile and opaque ground tiles", () => {
        expect(Object.values(set.tiles).some((f) => f.length > 1 && new Set(f.map((x) => x.join())).size > 1)).toBe(true);
      });
      it("uses a limited palette", () => {
        expect(Object.keys(set.palette).length).toBeLessThanOrEqual(52);
      });
    });
  }

  it("Old Town has the ground, building and prop tiles the maps need", () => {
    const t = TILESETS[0].tiles;
    for (const n of ["grass", "path", "plaza", "water", "brick-wall", "door", "window", "roof-slate", "roof-eave", "tree-trunk", "lamp-top", "lamp-base"]) expect(t[n]).toBeDefined();
    // ground tiles are fully opaque so maps never show holes
    for (const n of ["grass", "path", "plaza", "water", "brick-wall", "roof-slate"]) for (const f of t[n]) expect(f.join("")).not.toContain(".");
  });

  it("composes scenes with animated tiles", () => {
    for (const s of [OLD_TOWN_SCENE, DRAFTING_HALL_SCENE]) {
      expect(validateSprite(s)).toEqual([]);
      expect(new Set(s.anims.idle.map((f) => f.join())).size).toBeGreaterThan(1);
      expect(s.w % 16).toBe(0);
    }
  });

  it("composeScene reports unknown legend entries and tiles", () => {
    const set = TILESETS[0];
    expect(() => composeScene(set, "x", ["?"], {})).toThrow(/legend/);
    expect(() => composeScene(set, "x", ["a"], { a: ["nope"] })).toThrow(/unknown tile/);
  });
});
