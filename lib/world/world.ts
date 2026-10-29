export type Dir = "up" | "down" | "left" | "right";

export interface Npc {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: Dir;
  /** Id of the dialogue script to run when spoken to. */
  dialogue: string;
}

export interface Warp {
  x: number;
  y: number;
  to: string;
  toX: number;
  toY: number;
  facing: Dir;
}

export interface MapDef {
  id: string;
  name: string;
  /** Tile map rows; each character is a key of the scene legend. */
  rows: readonly string[];
  /** Characters the player cannot walk through. */
  solid: string;
  npcs: readonly Npc[];
  warps: readonly Warp[];
  /** Readable tiles: signs, notice boards. Key "x,y". */
  signs: Readonly<Record<string, string>>;
}

export interface PlayerState {
  map: string;
  x: number;
  y: number;
  facing: Dir;
}

export type StepResult =
  | { kind: "moved"; state: PlayerState }
  | { kind: "turned"; state: PlayerState }
  | { kind: "blocked"; state: PlayerState }
  | { kind: "warped"; state: PlayerState };

export type Target = { kind: "npc"; npc: Npc } | { kind: "sign"; dialogue: string };

export const DELTA: Readonly<Record<Dir, readonly [number, number]>> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export const OPPOSITE: Readonly<Record<Dir, Dir>> = { up: "down", down: "up", left: "right", right: "left" };

export type MapTable = Readonly<Record<string, MapDef>>;

export function inBounds(map: MapDef, x: number, y: number): boolean {
  return y >= 0 && y < map.rows.length && x >= 0 && x < map.rows[y].length;
}

export function npcAt(map: MapDef, x: number, y: number): Npc | undefined {
  return map.npcs.find((n) => n.x === x && n.y === y);
}

/** A tile can be entered when it is on the map, not solid and not occupied by an NPC. */
export function walkable(map: MapDef, x: number, y: number): boolean {
  return inBounds(map, x, y) && !map.solid.includes(map.rows[y][x]) && !npcAt(map, x, y);
}

/**
 * One grid step. Pressing a new direction while standing still only turns
 * (so the player can face an NPC without walking into it); pressing the
 * facing direction moves. Stepping onto a warp tile changes map.
 */
export function step(maps: MapTable, p: PlayerState, dir: Dir): StepResult {
  const map = maps[p.map];
  if (!map) throw new Error(`unknown map "${p.map}"`);
  if (p.facing !== dir) return { kind: "turned", state: { ...p, facing: dir } };
  const [dx, dy] = DELTA[dir];
  const nx = p.x + dx;
  const ny = p.y + dy;
  // Doors and mats are warp tiles: they may be solid-looking tiles, so check them first.
  const warp = map.warps.find((w) => w.x === nx && w.y === ny);
  if (warp && inBounds(map, nx, ny) && !npcAt(map, nx, ny)) {
    return { kind: "warped", state: { map: warp.to, x: warp.toX, y: warp.toY, facing: warp.facing } };
  }
  if (!walkable(map, nx, ny)) return { kind: "blocked", state: p };
  return { kind: "moved", state: { ...p, x: nx, y: ny } };
}

/** What the player is facing and can talk to or read. */
export function facingTarget(maps: MapTable, p: PlayerState): Target | undefined {
  const map = maps[p.map];
  const [dx, dy] = DELTA[p.facing];
  const tx = p.x + dx;
  const ty = p.y + dy;
  const npc = npcAt(map, tx, ty);
  if (npc) return { kind: "npc", npc };
  const sign = map.signs[`${tx},${ty}`];
  return sign ? { kind: "sign", dialogue: sign } : undefined;
}

/** NPCs turn to face the player when spoken to. */
export function faceNpcToward(npc: Npc, p: PlayerState): Npc {
  return { ...npc, facing: OPPOSITE[p.facing] };
}

/** Problems with a map table (ragged rows, bad legend chars, unreachable warps); empty when valid. */
export function validateMaps(maps: MapTable, legends: Readonly<Record<string, Readonly<Record<string, unknown>>>>): string[] {
  const errs: string[] = [];
  for (const map of Object.values(maps)) {
    const w = map.rows[0]?.length ?? 0;
    map.rows.forEach((r, y) => {
      if (r.length !== w) errs.push(`${map.id}: row ${y} has width ${r.length}, want ${w}`);
      for (const ch of r) if (!legends[map.id]?.[ch]) errs.push(`${map.id}: row ${y} uses "${ch}" not in the legend`);
    });
    for (const n of map.npcs) {
      if (!inBounds(map, n.x, n.y) || map.solid.includes(map.rows[n.y][n.x])) errs.push(`${map.id}: npc ${n.id} stands on a solid or missing tile`);
    }
    for (const wp of map.warps) {
      const dest = maps[wp.to];
      if (!inBounds(map, wp.x, wp.y)) errs.push(`${map.id}: warp at ${wp.x},${wp.y} is off the map`);
      if (!dest) errs.push(`${map.id}: warp to unknown map "${wp.to}"`);
      else if (!walkable(dest, wp.toX, wp.toY)) errs.push(`${map.id}: warp lands on a blocked tile of ${wp.to} (${wp.toX},${wp.toY})`);
    }
    for (const key of Object.keys(map.signs)) {
      const [x, y] = key.split(",").map(Number);
      if (!inBounds(map, x, y)) errs.push(`${map.id}: sign ${key} is off the map`);
    }
  }
  return errs;
}
