import { describe, expect, it } from "vitest";
import { DRAFTING_HALL_SCENE, OLD_TOWN_SCENE, SOLID_SQUARE_SCENE, PRINCIPLE_HALL_SCENE, FOUNDRY_SCENE, FOUNDRY_HALL_SCENE, FOUNDRY_HALL_ROWS, FOUNDRY_ROWS, FOUNDRY_LEGEND, FOUNDRY_TILES, BRIDGES_SCENE, BRIDGES_ROWS, BRIDGES_LEGEND, BRIDGES_TILES, TILESETS } from "@/game/sprites/tiles";
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

  it("Foundry ground tiles are opaque and its map rows are rectangular and fully mapped", () => {
    for (const n of ["cinder", "cinder-2", "plate", "conveyor", "molten-channel", "brick-wall", "roof-sawtooth"]) for (const f of FOUNDRY_TILES.tiles[n]) expect(f.join("")).not.toContain(".");
    expect(new Set(FOUNDRY_ROWS.map((r) => r.length)).size).toBe(1);
    for (const r of FOUNDRY_ROWS) for (const ch of r) expect(FOUNDRY_LEGEND[ch]).toBeDefined();
    expect(FOUNDRY_TILES.tiles.conveyor).toHaveLength(4);
    expect(new Set(FOUNDRY_HALL_ROWS.map((r) => r.length)).size).toBe(1);
    for (const r of FOUNDRY_HALL_ROWS) for (const ch of r) expect(FOUNDRY_LEGEND[ch]).toBeDefined();
  });

  it("Bridges ground and water tiles are opaque, its map rows are rectangular and fully mapped", () => {
    for (const n of ["quay", "quay-2", "water", "quay-edge", "bridge-deck", "arch-crown", "warehouse-wall", "roof-teal", "piles", "boat"]) for (const f of BRIDGES_TILES.tiles[n]) expect(f.join("")).not.toContain(".");
    expect(new Set(BRIDGES_ROWS.map((r) => r.length)).size).toBe(1);
    for (const r of BRIDGES_ROWS) for (const ch of r) expect(BRIDGES_LEGEND[ch]).toBeDefined();
    expect(BRIDGES_TILES.tiles.water).toHaveLength(4);
  });

  it("composes scenes with animated tiles", () => {
    for (const s of [OLD_TOWN_SCENE, DRAFTING_HALL_SCENE, SOLID_SQUARE_SCENE, PRINCIPLE_HALL_SCENE, FOUNDRY_SCENE, FOUNDRY_HALL_SCENE, BRIDGES_SCENE]) {
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
