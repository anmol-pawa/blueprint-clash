import type { Frame, SpriteDef } from "../pixel";
import { TRANSPARENT, validateSprite } from "../pixel";

/**
 * A tileset: square tiles, each with one or more frames (animated tiles such
 * as water and lamps have 2–4). Same palette + row-string format as sprites.
 */
export interface TileSetDef {
  id: string;
  name: string;
  /** Tile edge in pixels. */
  size: number;
  palette: Readonly<Record<string, string>>;
  tiles: Readonly<Record<string, readonly Frame[]>>;
  /** Frames per second for animated tiles (default 3). */
  fps?: Readonly<Record<string, number>>;
}

/** Problems with a tileset; empty when valid. */
export function validateTileSet(set: TileSetDef): string[] {
  const errs: string[] = [];
  for (const [name, frames] of Object.entries(set.tiles)) {
    if (frames.length < 1 || frames.length > 4) errs.push(`${name}: ${frames.length} frames (want 1–4)`);
    const asSprite: SpriteDef = { id: name, name, w: set.size, h: set.size, palette: set.palette, anims: { idle: frames.length >= 2 ? frames : [frames[0], frames[0]] } };
    errs.push(...validateSprite(asSprite).map((e) => `${name}: ${e}`));
  }
  return errs;
}

/** Tile names used by a scene legend: each map character stacks one or more tiles (first = bottom). */
export type Legend = Readonly<Record<string, readonly string[]>>;

const SCENE_FRAMES = 4;

/**
 * Compose a tile map into one sprite for review pages and tests. Animated
 * tiles cycle through their frames across the scene's 4 frames. Transparent
 * pixels in a tile show the tile below it in the stack.
 */
export function composeScene(set: TileSetDef, id: string, rows: readonly string[], legend: Legend): SpriteDef {
  const cols = rows[0].length;
  const s = set.size;
  const frames: string[][] = [];
  for (let f = 0; f < SCENE_FRAMES; f++) {
    const grid = Array.from({ length: rows.length * s }, () => Array<string>(cols * s).fill(TRANSPARENT));
    rows.forEach((row, ty) =>
      [...row].forEach((ch, tx) => {
        const stack = legend[ch];
        if (!stack) throw new Error(`scene ${id}: no legend entry for "${ch}" at ${tx},${ty}`);
        for (const name of stack) {
          const tf = set.tiles[name];
          if (!tf) throw new Error(`scene ${id}: unknown tile "${name}"`);
          const fr = tf[f % tf.length];
          for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) if (fr[y][x] !== TRANSPARENT) grid[ty * s + y][tx * s + x] = fr[y][x];
        }
      }),
    );
    frames.push(grid.map((r) => r.join("")));
  }
  return { id, name: id, w: cols * s, h: rows.length * s, palette: set.palette, fps: { idle: 3 }, anims: { idle: frames } };
}
