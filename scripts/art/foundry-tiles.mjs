// Creational Foundry tileset: a sooty brick works district with furnace glow, steel plate floors,
// conveyors that carry products out, smokestacks and gears.
// Run: node scripts/art/foundry-tiles.mjs   (ART_PREVIEW=<dir> writes contact sheets)
import { writeFileSync } from "node:fs";
import { Layer, previewSheet } from "./paint.mjs";

const S = 16;
const PALETTE = {
  k: "#17121a", w: "#ffffff", y: "#f0b429", x: "#b5650f", z: "#efe3b8",
  a: "#2a262e", b: "#403b46", c: "#5a5463", // cinder ground
  d: "#454d5c", e: "#67718a", f: "#97a3bc", // steel plate
  n: "#4a301e", o: "#7a5230", p: "#b07f45", // wood
  1: "#5e231d", 2: "#9a432f", 3: "#cc6c47", // brick
  4: "#4f463f", 5: "#827669", 6: "#b3a593", // mortar and stone
  g: "#a1270b", h: "#f0661a", i: "#ffd35a", // molten metal
  P: "#33384a", Q: "#1f2330", R: "#737b92", // iron
  7: "#625e6b", 8: "#928ea0", 9: "#c8c4d6", // smoke
  J: "#ffb347", L: "#2b1d1a", // furnace glass
  T: "#1f7a78", U: "#3fb5ae", // teal product crates
};
const R = (s) => [...s];
const CINDER = R("abc"), PLATE = R("def");

const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const tile = () => new Layer(S, S);
const fill = (L, ramp, v, seed, spread = 0.22) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) L.set(x, y, L.shade(ramp, v + (hash(x, y, seed) - 0.5) * spread * 2, x, y)); return L; };
const rect = (L, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) L.set(x, y, c); return L; };
const box = (L, x0, y0, x1, y1, c) => { L.line(x0, y0, x1, y0, c).line(x0, y1, x1, y1, c).line(x0, y0, x0, y1, c).line(x1, y0, x1, y1, c); return L; };
const outlined = (L) => L.outline("k");

function cinder(seed) {
  const L = fill(tile(), CINDER, 0.5, seed, 0.2);
  for (let i = 0; i < 6; i++) { const x = Math.floor(hash(i, 1, seed) * 15), y = Math.floor(hash(i, 2, seed) * 15); L.set(x, y, "c"); }
  if (seed === 2) { L.set(4, 5, "h"); L.set(11, 11, "g"); }
  return L;
}
// diamond tread steel plate with corner rivets
function plate() {
  const L = fill(tile(), PLATE, 0.5, 5, 0.05);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x + 2) % 8, dy = (y + 2) % 8;
    if (dx === 3 && dy >= 2 && dy <= 5) L.set(x, y, "f");
    if (dy === 3 && dx >= 2 && dx <= 5) L.set(x, y, "f");
  }
  L.line(0, 0, 15, 0, "d"); L.line(0, 0, 0, 15, "d");
  for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]]) L.set(x, y, "R");
  return L;
}
// a conveyor belt moving right: dark rubber with cleats that advance 4px per frame
function conveyor(frame) {
  const L = tile();
  rect(L, 0, 0, 15, 15, "P");
  rect(L, 0, 3, 15, 12, "Q");
  for (let x = 0; x < S; x++) { const cleat = (x + frame * 4) % 8 < 2; for (let y = 4; y <= 11; y++) L.set(x, y, cleat ? "R" : y < 6 ? "P" : "Q"); }
  L.line(0, 3, 15, 3, "R"); L.line(0, 12, 15, 12, "P");
  for (let x = 1; x < S; x += 5) { L.set(x, 1, "R"); L.set(x, 14, "R"); }
  return L;
}
// a channel of molten metal set in the cinder floor, bright ripples drifting along it
function moltenChannel(frame) {
  const L = cinder(1);
  rect(L, 0, 4, 15, 11, "Q"); L.line(0, 4, 15, 4, "R"); L.line(0, 11, 15, 11, "P");
  for (let y = 5; y <= 10; y++) for (let x = 0; x < S; x++) {
    const w = Math.sin((x - frame * 4) * 0.8 + y * 0.9) + Math.sin(x * 0.4 + frame);
    L.set(x, y, w > 1.1 ? "i" : w < -1.0 ? "g" : "h");
  }
  return L;
}

// ---------- buildings ----------
function brick(seed = 3) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const row = Math.floor(y / 4), off = row % 2 ? 4 : 0;
    const mortar = y % 4 === 3 || (x + off) % 8 === 7;
    L.set(x, y, mortar ? "4" : hash(Math.floor((x + off) / 8), row, seed) > 0.55 ? "3" : y % 4 === 0 ? "3" : "2");
  }
  for (let i = 0; i < 10; i++) { const x = Math.floor(hash(i, 8, seed) * 16), y = Math.floor(hash(i, 9, seed) * 16); if (L.get(x, y) === "2") L.set(x, y, "1"); }
  return L;
}
// sawtooth factory roof: slate ribs with a glazed north light
function roof(edge = false) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) L.set(x, y, x % 8 < 5 ? (y % 4 === 3 ? "P" : "Q") : "d");
  for (let x = 0; x < S; x++) if (x % 8 === 5) for (let y = 0; y < S; y++) L.set(x, y, "R");
  if (edge) { rect(L, 0, 13, 15, 15, "P"); L.line(0, 12, 15, 12, "R"); for (let x = 0; x < S; x += 2) L.set(x, 15, "k"); }
  return L;
}
function window_(frame) {
  const L = brick(3);
  rect(L, 3, 3, 12, 13, "P"); rect(L, 4, 4, 11, 12, "L");
  for (let y = 5; y <= 11; y++) for (let x = 5; x <= 10; x++) L.set(x, y, hash(x, y, frame + 4) > 0.55 ? "i" : frame ? "J" : "h");
  L.line(7, 4, 7, 12, "P"); L.line(8, 4, 8, 12, "P"); L.line(4, 8, 11, 8, "P");
  L.line(2, 14, 13, 14, "R"); L.line(2, 2, 13, 2, "6");
  return L;
}
// a furnace mouth in the wall: iron frame, flickering molten glow
function furnace(frame) {
  const L = brick(5);
  rect(L, 2, 2, 13, 15, "Q"); rect(L, 3, 3, 12, 15, "P");
  rect(L, 4, 6, 11, 14, "L");
  for (let y = 7; y <= 13; y++) for (let x = 5; x <= 10; x++) { const v = Math.sin((x + frame * 2) * 1.3) + (14 - y) * 0.25 + (hash(x, y, frame) - 0.5); L.set(x, y, v > 1.7 ? "i" : v > 0.7 ? "h" : "g"); }
  L.line(3, 5, 12, 5, "R"); L.line(2, 2, 13, 2, "R"); L.set(7, 4, "y"); L.set(8, 4, "y");
  return L;
}
// big roller door in a brick wall, slats and a hazard-stripe sill
function rollerDoor() {
  const L = brick(7);
  rect(L, 1, 2, 14, 15, "Q"); rect(L, 2, 3, 13, 15, "P");
  for (let y = 4; y < 15; y += 2) L.line(2, y, 13, y, y % 4 ? "R" : "d");
  rect(L, 6, 12, 9, 13, "Q"); L.set(7, 12, "y");
  for (let x = 1; x <= 14; x++) L.set(x, 15, x % 4 < 2 ? "y" : "k");
  return L;
}
function girder() {
  const L = brick(2);
  rect(L, 5, 0, 10, 15, "R"); rect(L, 6, 0, 9, 15, "P"); rect(L, 5, 0, 5, 15, "f");
  for (let y = 1; y < S; y += 4) { L.set(6, y, "f"); L.set(9, y, "f"); }
  L.line(10, 0, 10, 15, "Q");
  return L;
}

// ---------- props (transparent background) ----------
function smokestackTop(frame) {
  const L = tile();
  rect(L, 4, 8, 11, 15, "2"); rect(L, 4, 8, 5, 15, "3"); rect(L, 10, 8, 11, 15, "1");
  for (let y = 8; y < 15; y += 4) L.line(4, y + 3, 11, y + 3, "4");
  rect(L, 3, 6, 12, 8, "P"); L.line(3, 6, 12, 6, "R");
  // smoke: soft puffs drifting up and sideways
  const puffs = [[8, 4 - frame], [10 + frame, 1], [6 + frame, 2 - frame * 0]];
  for (const [cx, cy] of puffs) L.ellipse(cx, cy, 3, 2, R("789"), { bias: 0.1 });
  return outlined(L);
}
function smokestackBase() { const L = tile(); rect(L, 4, 0, 11, 12, "2"); rect(L, 4, 0, 5, 12, "3"); rect(L, 10, 0, 11, 12, "1"); L.line(4, 3, 11, 3, "4"); L.line(4, 7, 11, 7, "4"); rect(L, 3, 12, 12, 15, "P"); L.line(3, 12, 12, 12, "R"); return outlined(L); }
function gear(frame) {
  const L = tile();
  const cx = 7.5, cy = 7.5, teeth = 8, off = frame * (Math.PI / teeth / 2);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + off;
    const tooth = Math.cos(a * teeth) > 0.1;
    if (d <= 5.2 || (d <= 7.3 && tooth)) L.set(x, y, d < 2.2 ? "L" : d < 3.4 ? "Q" : (x + y) % 5 === 0 ? "f" : dx + dy < 0 ? "R" : "e");
  }
  L.set(7, 7, "k"); L.set(8, 8, "k");
  return outlined(L);
}
function crate() { const L = tile(); rect(L, 1, 3, 14, 14, "o"); rect(L, 1, 3, 14, 4, "p"); box(L, 1, 3, 14, 14, "n"); L.line(1, 3, 14, 14, "n"); L.line(14, 3, 1, 14, "n"); rect(L, 6, 7, 9, 10, "U"); rect(L, 6, 7, 9, 7, "w"); rect(L, 6, 10, 9, 10, "T"); return outlined(L); }
function barrel() { const L = tile(); rect(L, 3, 2, 12, 14, "x"); rect(L, 3, 2, 5, 14, "y"); rect(L, 10, 2, 12, 14, "n"); L.line(3, 5, 12, 5, "Q"); L.line(3, 11, 12, 11, "Q"); L.set(7, 8, "w"); return outlined(L); }
function anvil() {
  const L = tile();
  rect(L, 3, 4, 13, 7, "R"); rect(L, 3, 4, 13, 4, "f"); L.set(1, 5, "R"); L.set(2, 5, "R"); L.set(14, 5, "R");
  rect(L, 6, 8, 10, 11, "P"); rect(L, 4, 12, 12, 14, "Q"); L.line(4, 12, 12, 12, "R");
  L.set(8, 3, "i"); L.set(9, 2, "h"); L.set(7, 2, "y");
  return outlined(L);
}
function lampTop(frame) {
  const L = tile();
  rect(L, 7, 5, 8, 15, "P"); L.line(7, 5, 7, 15, "R"); rect(L, 5, 1, 10, 6, "Q"); rect(L, 6, 2, 9, 5, frame ? "i" : "h");
  L.set(7, 3, "w"); L.line(4, 0, 11, 0, "P");
  return outlined(L);
}
function lampBase() { const L = tile(); rect(L, 7, 0, 8, 11, "P"); L.line(7, 0, 7, 11, "R"); rect(L, 5, 12, 10, 15, "Q"); L.line(5, 12, 10, 12, "R"); return outlined(L); }
// the district sign: a hammer-and-blueprint plate on two posts
function sign() { const L = tile(); rect(L, 3, 8, 4, 15, "n"); rect(L, 11, 8, 12, 15, "n"); rect(L, 1, 2, 14, 9, "P"); rect(L, 2, 3, 13, 8, "Q"); L.line(5, 4, 5, 7, "i"); L.line(4, 4, 7, 4, "i"); L.line(9, 7, 12, 4, "R"); L.line(10, 7, 12, 5, "f"); return outlined(L); }
// stacked products ready to ship
function pallet() { const L = tile(); rect(L, 1, 12, 14, 14, "n"); rect(L, 1, 12, 14, 12, "o"); rect(L, 2, 7, 7, 11, "U"); rect(L, 2, 7, 7, 7, "w"); box(L, 2, 7, 7, 11, "T"); rect(L, 8, 7, 13, 11, "U"); rect(L, 8, 7, 13, 7, "w"); box(L, 8, 7, 13, 11, "T"); rect(L, 5, 2, 10, 6, "U"); rect(L, 5, 2, 10, 2, "w"); box(L, 5, 2, 10, 6, "T"); return outlined(L); }
// a pipe running across with a valve wheel
function pipe() { const L = tile(); rect(L, 0, 6, 15, 10, "R"); rect(L, 0, 6, 15, 7, "f"); rect(L, 0, 10, 15, 10, "P"); rect(L, 6, 5, 9, 11, "P"); rect(L, 7, 2, 8, 5, "Q"); L.line(5, 2, 10, 2, "g"); L.set(5, 1, "g"); L.set(10, 1, "g"); return outlined(L); }

const FOUNDRY = {
  id: "foundry", name: "Creational Foundry tiles", fps: { conveyor: 6, "molten-channel": 3, window: 2, furnace: 5, "smokestack-top": 2, gear: 4, "lamp-top": 3 },
  tiles: {
    cinder: [cinder(1)], "cinder-2": [cinder(2)], plate: [plate()],
    conveyor: [0, 1, 2, 3].map(conveyor), "molten-channel": [0, 1, 2, 3].map(moltenChannel),
    "brick-wall": [brick()], "roof-sawtooth": [roof()], "roof-eave": [roof(true)], window: [window_(0), window_(1)],
    furnace: [0, 1, 2, 3].map(furnace), "roller-door": [rollerDoor()], girder: [girder()],
    "smokestack-top": [smokestackTop(0), smokestackTop(1)], "smokestack-base": [smokestackBase()],
    gear: [0, 1, 2, 3].map(gear), crate: [crate()], barrel: [barrel()], anvil: [anvil()],
    "lamp-top": [lampTop(0), lampTop(1)], "lamp-base": [lampBase()], sign: [sign()], pallet: [pallet()], pipe: [pipe()],
  },
};

const body = Object.entries(FOUNDRY.tiles).map(([k, frames]) => `    ${JSON.stringify(k)}: [\n${frames.map((f) => `      [\n${f.rows().map((r) => `        ${JSON.stringify(r)},`).join("\n")}\n      ],`).join("\n")}\n    ],`).join("\n");
writeFileSync("game/sprites/tiles/foundry.ts", `// Generated by scripts/art/foundry-tiles.mjs, then committed. Edit freely.
import type { TileSetDef } from "./tileset";

export const FOUNDRY_TILES: TileSetDef = {
  id: ${JSON.stringify(FOUNDRY.id)},
  name: ${JSON.stringify(FOUNDRY.name)},
  size: ${S},
  palette: ${JSON.stringify(PALETTE, null, 2).replace(/\n/g, "\n  ")},
  fps: ${JSON.stringify(FOUNDRY.fps)},
  tiles: {
${body}
  },
};
`);
previewSheet(FOUNDRY.id, PALETTE, FOUNDRY.tiles, 4);
