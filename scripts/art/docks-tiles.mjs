// Concurrency Docks tileset: a working harbour where threads "share a quay". Wet timber piers, cobbled quay,
// animated water, brick warehouses, crates with padlocks, barrels, bollards, rope coils, a loading crane and lanterns.
// Run: node scripts/art/docks-tiles.mjs   (ART_PREVIEW=<dir> writes contact sheets)
import { writeFileSync } from "node:fs";
import { Layer, previewSheet } from "./paint.mjs";

const S = 16;
const PALETTE = {
  k: "#10161c", w: "#ffffff", y: "#f0b429", z: "#fff1c2",
  a: "#4d5a63", b: "#6e7f89", c: "#9aabb3", // quay cobbles (cool grey)
  n: "#3d2a1a", o: "#6b4a2b", p: "#9a7143", // pier planks
  1: "#14405c", 2: "#1f6f94", 3: "#4fb0cf", 4: "#bfe9f2", // water: deep, body, light, foam
  5: "#5a2a22", 6: "#8c3f30", 7: "#bb5f45", // warehouse brick
  8: "#2f3b45", 9: "#46586a", // slate roof
  s: "#d9d2bd", t: "#a89f86", // whitewash / rope
  P: "#3a4651", Q: "#222b33", R: "#7b8b98", // iron
  L: "#1c2a36", J: "#ffd35a", // glass, lantern glow
  g: "#3f7d4e", h: "#7bc47f", // moss / crate paint
  d: "#c9822b", e: "#8a5a1c", // crate wood
};
const R = (s) => [...s];
const QUAY = R("abc"), BRICK = R("567");

const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const tile = () => new Layer(S, S);
const fill = (L, ramp, v, seed, spread = 0.2) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) L.set(x, y, L.shade(ramp, v + (hash(x, y, seed) - 0.5) * spread * 2, x, y)); return L; };
const rect = (L, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) L.set(x, y, c); return L; };
const outlined = (L) => L.outline("k");

// ---------- ground ----------
function quay(seed) {
  const L = fill(tile(), QUAY, 0.55, seed, 0.12);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const row = Math.floor(y / 5), off = row % 2 ? 4 : 0;
    if (y % 5 === 4 || (x + off) % 8 === 7) L.set(x, y, "a");
    else if (y % 5 === 0) L.set(x, y, "c");
  }
  if (seed === 2) { L.set(3, 2, "g"); L.set(4, 2, "h"); L.set(11, 12, "g"); }
  return L;
}
// pier boards run across; every board has a darker seam and nail heads
function pier(seed) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const board = Math.floor(x / 4);
    L.set(x, y, x % 4 === 3 ? "n" : hash(board, seed, 3) > 0.5 ? "p" : "o");
  }
  for (const [x, y] of [[1, 1], [1, 14], [5, 1], [5, 14], [9, 1], [9, 14], [13, 1], [13, 14]]) L.set(x, y, "n");
  if (seed === 2) { L.set(2, 7, "n"); L.set(2, 8, "n"); L.set(10, 4, "g"); L.set(10, 5, "g"); }
  return L;
}
// water: three-band ripple that scrolls; foam glints
function water(frame) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const w = Math.sin(((x + frame * 4) / 16) * Math.PI * 2 + y * 0.9);
    L.set(x, y, w > 0.75 ? "3" : w > -0.2 ? "2" : "1");
  }
  for (const [x, y] of [[3, 3], [11, 9], [7, 13]]) { const xx = (x + frame * 4) % S; L.set(xx, y, "4"); L.set((xx + 1) % S, y, "4"); }
  return L;
}
// quay edge: stone lip above water, with moss; the water below keeps animating
function quayEdge(frame) {
  const L = water(frame);
  rect(L, 0, 0, 15, 9, "b"); rect(L, 0, 0, 15, 2, "c"); L.line(0, 9, 15, 9, "a"); L.line(0, 10, 15, 10, "P");
  for (let x = 0; x < S; x += 8) L.line(x + 7, 3, x + 7, 8, "a");
  L.set(4, 10, "g"); L.set(5, 10, "h"); L.set(12, 10, "g");
  return L;
}

// ---------- the warehouse ----------
function brick(seed = 4) {
  const L = fill(tile(), BRICK, 0.5, seed, 0.1);
  for (let y = 3; y < S; y += 4) L.line(0, y, 15, y, "5");
  for (let y = 0; y < S; y += 4) { const off = (y / 4) % 2 ? 4 : 0; for (let x = off; x < S; x += 8) L.line(x, y, x, y + 2, "5"); }
  return L;
}
function roofSlate(edge = false) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const row = Math.floor(y / 4), off = row % 2 ? 4 : 0, cx = (x + off) % 8;
    L.set(x, y, y % 4 === 3 ? "8" : cx === 7 ? "8" : cx < 2 ? "R" : "9");
  }
  if (edge) { rect(L, 0, 12, 15, 15, "8"); L.line(0, 12, 15, 12, "9"); for (let x = 0; x < S; x += 2) L.set(x, 15, "k"); }
  return L;
}
function shutter(frame) {
  const L = brick(4);
  rect(L, 3, 3, 12, 13, "Q"); rect(L, 4, 4, 11, 12, "L");
  for (let y = 5; y <= 11; y++) for (let x = 5; x <= 10; x++) if (hash(x, y, frame + 7) > 0.78) L.set(x, y, "J");
  L.line(7, 4, 7, 12, "Q"); L.line(8, 4, 8, 12, "Q"); L.line(4, 8, 11, 8, "Q");
  rect(L, 2, 14, 13, 14, "t"); rect(L, 1, 3, 2, 13, "g"); rect(L, 13, 3, 14, 13, "g"); // moss-green shutters
  return L;
}
// the cargo door: big planked double door with an iron padlock hasp
function cargoDoor() {
  const L = brick(6);
  rect(L, 2, 1, 13, 15, "Q"); rect(L, 3, 2, 12, 15, "o");
  for (let x = 3; x <= 12; x += 3) L.line(x, 2, x, 15, "n");
  L.line(7, 2, 7, 15, "Q"); L.line(8, 2, 8, 15, "Q");
  L.line(3, 5, 12, 5, "P"); L.line(3, 11, 12, 11, "P");
  rect(L, 5, 7, 6, 9, "y"); L.set(5, 7, "z"); L.line(5, 6, 6, 6, "R"); // padlock (the point of the district)
  return L;
}
// hanging sign board: an anchor over a padlock
function signBoard() { const L = tile(); rect(L, 7, 8, 8, 15, "n"); rect(L, 1, 1, 14, 9, "8"); rect(L, 2, 2, 13, 8, "Q"); L.line(5, 3, 5, 7, "c"); L.line(3, 5, 7, 5, "c"); L.line(3, 6, 4, 7, "c"); L.line(6, 7, 7, 6, "c"); rect(L, 9, 5, 12, 7, "y"); L.line(10, 3, 11, 3, "R"); L.set(9, 4, "R"); L.set(12, 4, "R"); return outlined(L); }

// ---------- props (transparent) ----------
function crate(locked) {
  const L = tile();
  rect(L, 1, 3, 14, 14, "d"); rect(L, 1, 3, 14, 4, "y"); rect(L, 1, 3, 2, 14, "e"); rect(L, 13, 3, 14, 14, "e");
  L.line(1, 8, 14, 8, "e"); L.line(1, 3, 14, 14, "e"); L.line(14, 3, 1, 14, "e");
  if (locked) { rect(L, 6, 7, 9, 10, "y"); L.set(6, 7, "z"); rect(L, 7, 5, 8, 6, "R"); L.set(7, 9, "Q"); }
  return outlined(L);
}
function barrel() { const L = tile(); L.ellipse(7.5, 8.5, 5.5, 7, R("opp"), { bias: 0 }); L.line(2, 5, 13, 5, "P"); L.line(2, 11, 13, 11, "P"); L.line(3, 2, 12, 2, "n"); return outlined(L); }
function bollard() { const L = tile(); rect(L, 5, 7, 10, 14, "P"); rect(L, 5, 7, 6, 14, "R"); rect(L, 3, 4, 12, 7, "Q"); rect(L, 3, 4, 12, 5, "P"); rect(L, 3, 13, 12, 15, "Q"); return outlined(L); }
function rope() { const L = tile(); L.ellipse(7.5, 9, 6, 4.5, R("tts"), { bias: 0 }); L.ellipse(7.5, 9, 3, 2, R("nnn"), { bias: 0 }); for (let i = 0; i < 4; i++) L.set(2 + i * 3, 6 + (i % 2), "o"); return outlined(L); }
// crane: a jib on a mast, in two tiles so it stands tall; the hook swings
function craneTop(frame) {
  const L = tile();
  rect(L, 6, 4, 9, 15, "P"); rect(L, 6, 4, 6, 15, "R"); rect(L, 0, 1, 15, 3, "Q"); rect(L, 0, 1, 15, 1, "R");
  const hx = 13 + (frame ? 1 : 0); L.line(hx, 4, hx, 10, "t"); rect(L, hx - 1, 11, hx + 1, 12, "y");
  return outlined(L);
}
function craneBase() { const L = tile(); rect(L, 6, 0, 9, 9, "P"); rect(L, 6, 0, 6, 9, "R"); rect(L, 3, 10, 12, 15, "Q"); rect(L, 3, 10, 12, 11, "P"); L.line(3, 10, 12, 10, "R"); return outlined(L); }
function lanternTop(frame) { const L = tile(); rect(L, 7, 5, 8, 15, "P"); L.line(7, 5, 7, 15, "R"); rect(L, 5, 1, 10, 6, "Q"); rect(L, 6, 2, 9, 5, frame ? "J" : "y"); L.set(7, 3, "w"); L.line(4, 0, 11, 0, "R"); return outlined(L); }
function lanternBase() { const L = tile(); rect(L, 7, 0, 8, 11, "P"); L.line(7, 0, 7, 11, "R"); rect(L, 5, 12, 10, 15, "Q"); L.line(5, 12, 10, 12, "R"); return outlined(L); }
// a net draped over the warehouse wall
function net() { const L = tile(); for (let i = 0; i < S; i += 4) { L.line(i, 0, i, 15, "t"); L.line(0, i, 15, i, "t"); } for (let i = 0; i < S; i += 4) for (let j = 0; j < S; j += 4) L.set(i, j, "s"); return L; }
// moored rowing boat seen from above, bobbing
function boat(frame) {
  const L = tile(); const dy = frame ? 1 : 0;
  L.ellipse(7.5, 8 + dy, 7, 4, R("opp"), { bias: 0 }); L.ellipse(7.5, 8 + dy, 5, 2.4, R("nnn"), { bias: 0 }); L.line(4, 8 + dy, 11, 8 + dy, "p");
  return outlined(L);
}

const DOCKS = {
  id: "docks", name: "Concurrency Docks tiles",
  fps: { water: 3, "quay-edge": 3, shutter: 2, "lantern-top": 3, "crane-top": 2, boat: 2 },
  tiles: {
    quay: [quay(1)], "quay-2": [quay(2)], pier: [pier(1)], "pier-2": [pier(2)], water: [0, 1, 2, 3].map(water), "quay-edge": [0, 1, 2, 3].map(quayEdge),
    "brick-wall": [brick()], "roof-slate": [roofSlate()], "roof-eave": [roofSlate(true)], shutter: [shutter(0), shutter(1)], "cargo-door": [cargoDoor()], "sign-board": [signBoard()],
    crate: [crate(false)], "crate-locked": [crate(true)], barrel: [barrel()], bollard: [bollard()], rope: [rope()],
    "crane-top": [craneTop(0), craneTop(1)], "crane-base": [craneBase()], "lantern-top": [lanternTop(0), lanternTop(1)], "lantern-base": [lanternBase()], net: [net()], boat: [boat(0), boat(1)],
  },
};

const body = Object.entries(DOCKS.tiles).map(([k, frames]) => `    ${JSON.stringify(k)}: [\n${frames.map((f) => `      [\n${f.rows().map((r) => `        ${JSON.stringify(r)},`).join("\n")}\n      ],`).join("\n")}\n    ],`).join("\n");
writeFileSync("game/sprites/tiles/docks.ts", `// Generated by scripts/art/docks-tiles.mjs, then committed. Edit freely.
import type { TileSetDef } from "./tileset";

export const DOCKS_TILES: TileSetDef = {
  id: ${JSON.stringify(DOCKS.id)},
  name: ${JSON.stringify(DOCKS.name)},
  size: ${S},
  palette: ${JSON.stringify(PALETTE, null, 2).replace(/\n/g, "\n  ")},
  fps: ${JSON.stringify(DOCKS.fps)},
  tiles: {
${body}
  },
};
`);
previewSheet(DOCKS.id, PALETTE, DOCKS.tiles, 4);
