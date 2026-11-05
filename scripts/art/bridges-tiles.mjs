// Structural Bridges tileset: a harbour district where pattern "adapters" join two banks. Sandstone quays,
// animated tidal water, plank and arch bridges, teal-roofed warehouses, a harbour crane, moored boats.
// Run: node scripts/art/bridges-tiles.mjs   (ART_PREVIEW=<dir> writes contact sheets)
import { writeFileSync } from "node:fs";
import { Layer, previewSheet } from "./paint.mjs";

const S = 16;
const PALETTE = {
  k: "#14161f", w: "#ffffff", y: "#f0b429", z: "#efe3b8",
  a: "#8a7a62", b: "#b09c7c", c: "#d2c19e", // sandstone quay
  d: "#1d4e7a", e: "#2f78a8", f: "#6fb4d6", g: "#cfeaf5", // water: deep, mid, light, foam
  n: "#4a301e", o: "#7a5230", p: "#b07f45", // wood
  1: "#27534f", 2: "#3a8a80", 3: "#6cc4b3", // teal roof / paint
  4: "#5c6573", 5: "#8c96a6", 6: "#c0c8d6", // stone grey (arches, piers)
  7: "#8a2f2a", 8: "#c4503f", 9: "#f08b6a", // terracotta / red paint
  P: "#33384a", Q: "#1f2330", R: "#737b92", // iron
  s: "#e8dcc0", t: "#bda985", // plaster wall
  L: "#2b2a3a", J: "#ffd35a", // window glass, lamp glow
};
const R = (s) => [...s];
const QUAY = R("abc"), PLASTER = R("tsz");

const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const tile = () => new Layer(S, S);
const fill = (L, ramp, v, seed, spread = 0.2) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) L.set(x, y, L.shade(ramp, v + (hash(x, y, seed) - 0.5) * spread * 2, x, y)); return L; };
const rect = (L, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) L.set(x, y, c); return L; };
const box = (L, x0, y0, x1, y1, c) => { L.line(x0, y0, x1, y0, c).line(x0, y1, x1, y1, c).line(x0, y0, x0, y1, c).line(x1, y0, x1, y1, c); return L; };
const outlined = (L) => L.outline("k");

// sandstone flagstones laid in an offset grid
function quay(seed) {
  const L = fill(tile(), QUAY, 0.55, seed, 0.12);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const row = Math.floor(y / 8), off = row ? 4 : 0;
    if (y % 8 === 7 || (x + off) % 8 === 7) L.set(x, y, "a");
    else if (y % 8 === 0) L.set(x, y, "c");
  }
  if (seed === 2) { L.set(3, 3, "a"); L.set(11, 11, "a"); L.set(12, 3, "c"); }
  return L;
}
// tidal water: two sine swells drift sideways; foam flecks on the crests
function water(frame) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const w = Math.sin((x + frame * 4) * 0.55 + y * 0.7) + Math.sin((x - frame * 4) * 0.3 - y * 0.4);
    L.set(x, y, w > 1.45 ? "g" : w > 0.5 ? "f" : w > -0.8 ? "e" : "d");
  }
  return L;
}
// the quay's edge: water below, a stone lip above with a shadow line
function quayEdge(frame) {
  const L = water(frame);
  rect(L, 0, 0, 15, 9, "b"); rect(L, 0, 0, 15, 1, "c"); L.line(0, 9, 15, 9, "a");
  for (let x = 0; x < S; x += 8) L.line(x + 7, 2, x + 7, 8, "a");
  L.line(0, 10, 15, 10, "Q"); L.line(0, 11, 15, 11, "d");
  return L;
}
// plank bridge deck, boards running across (horizontal bridge)
function deck() {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const board = Math.floor(x / 4);
    L.set(x, y, x % 4 === 3 ? "n" : y === 0 || y === 15 ? "n" : hash(board, Math.floor(y / 8), 3) > 0.5 ? "p" : "o");
  }
  for (const [x, y] of [[1, 2], [1, 13], [5, 2], [5, 13], [9, 2], [9, 13], [13, 2], [13, 13]]) L.set(x, y, "n");
  return L;
}
// bridge rails and posts, drawn over water or the deck
function railN() { const L = tile(); rect(L, 0, 0, 15, 15, "."); rect(L, 0, 1, 15, 3, "o"); rect(L, 0, 1, 15, 1, "p"); rect(L, 0, 7, 15, 8, "n"); for (const x of [1, 8, 14]) { rect(L, x, 0, x + 1, 12, "p"); L.line(x + 1, 0, x + 1, 12, "n"); } return outlined(L); }
function railS() { const L = tile(); rect(L, 0, 6, 15, 8, "o"); rect(L, 0, 6, 15, 6, "p"); rect(L, 0, 12, 15, 13, "n"); for (const x of [1, 8, 14]) { rect(L, x, 3, x + 1, 15, "p"); L.line(x + 1, 3, x + 1, 15, "n"); } return outlined(L); }
// stone arch bridge: parapet, voussoirs, a dark opening where boats pass
function arch(part) {
  const L = tile();
  // part: 0 left springer, 1 crown, 2 right springer
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) L.set(x, y, hash(x >> 2, y >> 2, 6) > 0.5 ? "5" : "4");
  for (let y = 3; y < S; y += 4) L.line(0, y, 15, y, "4");
  rect(L, 0, 0, 15, 2, "6"); L.line(0, 3, 15, 3, "R");
  const hole = (x, y) => { const cx = part === 0 ? 15.5 : part === 2 ? -0.5 : 7.5; const dx = (x - cx) / (part === 1 ? 11 : 8), dy = (y - 15) / 12; return dx * dx + dy * dy < 1; };
  for (let y = 4; y < S; y++) for (let x = 0; x < S; x++) if (hole(x, y)) L.set(x, y, y > 12 ? "d" : "Q");
  for (let y = 4; y < S; y++) for (let x = 0; x < S; x++) if (!hole(x, y) && (hole(x + 1, y) || hole(x - 1, y) || hole(x, y + 1) || hole(x, y - 1))) L.set(x, y, "6");
  return L;
}
// a wooden pile pair standing in the water
function piles(frame) {
  const L = water(frame);
  for (const x of [3, 10]) { rect(L, x, 0, x + 2, 12, "o"); rect(L, x, 0, x, 12, "p"); rect(L, x + 2, 0, x + 2, 12, "n"); L.line(x - 1, 13, x + 3, 13, "g"); }
  return L;
}

// ---------- buildings ----------
function wall(seed = 4) {
  const L = fill(tile(), PLASTER, 0.55, seed, 0.1);
  for (let x = 0; x < S; x += 4) L.line(x, 0, x, 15, "t"); // timber-lap board lines
  for (let y = 0; y < S; y += 5) L.line(0, y, 15, y, "t");
  return L;
}
function roofTile(edge = false) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const row = Math.floor(y / 4), off = row % 2 ? 4 : 0, cx = (x + off) % 8;
    L.set(x, y, y % 4 === 3 ? "1" : cx === 7 ? "1" : cx < 2 ? "3" : "2");
  }
  if (edge) { rect(L, 0, 12, 15, 15, "1"); L.line(0, 12, 15, 12, "3"); for (let x = 0; x < S; x += 2) L.set(x, 15, "k"); }
  return L;
}
function window_(frame) {
  const L = wall(4);
  rect(L, 3, 3, 12, 13, "n"); rect(L, 4, 4, 11, 12, "L");
  for (let y = 5; y <= 11; y++) for (let x = 5; x <= 10; x++) if (hash(x, y, frame + 2) > 0.72) L.set(x, y, "J");
  L.line(7, 4, 7, 12, "n"); L.line(8, 4, 8, 12, "n"); L.line(4, 8, 11, 8, "n");
  rect(L, 2, 14, 13, 14, "p"); rect(L, 4, 2, 11, 2, "2");
  return L;
}
function door() {
  const L = wall(6);
  rect(L, 3, 2, 12, 15, "n"); rect(L, 4, 3, 11, 15, "o");
  for (let x = 4; x <= 11; x += 2) L.line(x, 3, x, 15, "n");
  rect(L, 3, 1, 12, 2, "2"); L.line(3, 1, 12, 1, "3");
  L.set(10, 10, "y"); L.set(10, 11, "y");
  return L;
}

// ---------- props (transparent) ----------
function craneTop(frame) {
  const L = tile();
  rect(L, 6, 6, 9, 15, "Q"); rect(L, 6, 6, 6, 15, "R"); // mast
  rect(L, 0, 3, 15, 5, "8"); L.line(0, 3, 15, 3, "9"); L.line(0, 5, 15, 5, "7"); // jib
  rect(L, 2, 6, 13, 6, "P");
  const hook = 8 + frame; // hook swings by a pixel
  L.line(2, 6, 2, hook, "R"); rect(L, 1, hook + 1, 3, hook + 1, "y"); L.set(2, hook + 2, "y");
  rect(L, 11, 1, 14, 2, "P"); L.set(12, 1, "J"); // cab light
  return outlined(L);
}
function craneBase() { const L = tile(); rect(L, 6, 0, 9, 11, "Q"); rect(L, 6, 0, 6, 11, "R"); L.line(6, 3, 9, 8, "P"); L.line(9, 3, 6, 8, "P"); rect(L, 3, 12, 12, 15, "P"); L.line(3, 12, 12, 12, "R"); for (const x of [4, 7, 10]) L.set(x, 14, "y"); return outlined(L); }
// a rowing boat on the water, bobbing one pixel between frames
function boat(frame) {
  const L = water(frame);
  const b = frame % 2;
  const hull = tile();
  hull.poly([[1, 5 + b], [14, 5 + b], [12, 10 + b], [3, 10 + b]], R("78"), (x, y) => (y - 5) / 6);
  rect(hull, 1, 5 + b, 14, 5 + b, "9"); rect(hull, 7, 1 + b, 7, 5 + b, "n"); hull.poly([[8, 1 + b], [13, 3 + b], [8, 5 + b]], "w");
  hull.line(3, 10 + b, 12, 10 + b, "k");
  L.draw(outlined(hull));
  L.line(2, 12 + b, 13, 12 + b, "g");
  return L;
}
function bollard() { const L = tile(); rect(L, 5, 7, 10, 13, "Q"); rect(L, 5, 7, 6, 13, "R"); rect(L, 4, 5, 11, 7, "P"); L.line(4, 5, 11, 5, "R"); L.line(3, 14, 12, 14, "P"); L.line(5, 10, 10, 10, "y"); return outlined(L); }
function crate() { const L = tile(); rect(L, 1, 3, 14, 14, "o"); rect(L, 1, 3, 14, 4, "p"); box(L, 1, 3, 14, 14, "n"); L.line(1, 3, 14, 14, "n"); L.line(14, 3, 1, 14, "n"); rect(L, 6, 7, 9, 10, "3"); rect(L, 6, 7, 9, 7, "w"); return outlined(L); }
function ropes() { const L = tile(); L.ellipse(7.5, 10, 6, 3.5, R("n" + "o" + "p"), { bias: 0 }); for (const r of [4.5, 3, 1.5]) for (let a = 0; a < 6.3; a += 0.25) L.set(7.5 + Math.cos(a) * r * 1.3, 10 + Math.sin(a) * r * 0.75, "n"); L.line(12, 9, 14, 5, "p"); return outlined(L); }
function barrel() { const L = tile(); rect(L, 3, 2, 12, 14, "8"); rect(L, 3, 2, 5, 14, "9"); rect(L, 10, 2, 12, 14, "7"); L.line(3, 5, 12, 5, "Q"); L.line(3, 11, 12, 11, "Q"); L.set(7, 8, "w"); return outlined(L); }
function lampTop(frame) { const L = tile(); rect(L, 7, 5, 8, 15, "P"); L.line(7, 5, 7, 15, "R"); rect(L, 5, 1, 10, 6, "Q"); rect(L, 6, 2, 9, 5, frame ? "J" : "y"); L.set(7, 3, "w"); L.line(4, 0, 11, 0, "P"); return outlined(L); }
function lampBase() { const L = tile(); rect(L, 7, 0, 8, 11, "P"); L.line(7, 0, 7, 11, "R"); rect(L, 5, 12, 10, 15, "Q"); L.line(5, 12, 10, 12, "R"); return outlined(L); }
// district sign: two bank icons joined by a bridge line
function sign() { const L = tile(); rect(L, 3, 8, 4, 15, "n"); rect(L, 11, 8, 12, 15, "n"); rect(L, 1, 2, 14, 9, "1"); rect(L, 2, 3, 13, 8, "Q"); L.line(3, 7, 3, 4, "3"); L.line(12, 7, 12, 4, "3"); L.line(4, 4, 11, 4, "3"); L.line(5, 5, 6, 6, "3"); L.line(10, 5, 9, 6, "3"); return outlined(L); }
// a pennant flag on a short staff, fluttering
function flag(frame) { const L = tile(); rect(L, 4, 1, 4, 15, "R"); const w = frame ? 1 : 0; L.poly([[5, 2], [13, 3 + w], [5, 7]], R("789"), (x) => 0.45 + (x - 5) / 20); L.set(4, 0, "y"); return outlined(L); }

const BRIDGES = {
  id: "bridges", name: "Structural Bridges tiles", fps: { water: 4, "quay-edge": 4, piles: 4, boat: 2, window: 2, "crane-top": 2, "lamp-top": 3, flag: 3 },
  tiles: {
    quay: [quay(1)], "quay-2": [quay(2)], water: [0, 1, 2, 3].map(water), "quay-edge": [0, 1, 2, 3].map(quayEdge),
    "bridge-deck": [deck()], "rail-n": [railN()], "rail-s": [railS()],
    "arch-left": [arch(0)], "arch-crown": [arch(1)], "arch-right": [arch(2)], piles: [0, 1, 2, 3].map(piles),
    "warehouse-wall": [wall()], "roof-teal": [roofTile()], "roof-eave": [roofTile(true)], window: [window_(0), window_(1)], door: [door()],
    "crane-top": [craneTop(0), craneTop(1)], "crane-base": [craneBase()], boat: [0, 1, 2, 3].map(boat),
    bollard: [bollard()], crate: [crate()], ropes: [ropes()], barrel: [barrel()],
    "lamp-top": [lampTop(0), lampTop(1)], "lamp-base": [lampBase()], sign: [sign()], flag: [flag(0), flag(1)],
  },
};

const body = Object.entries(BRIDGES.tiles).map(([k, frames]) => `    ${JSON.stringify(k)}: [\n${frames.map((f) => `      [\n${f.rows().map((r) => `        ${JSON.stringify(r)},`).join("\n")}\n      ],`).join("\n")}\n    ],`).join("\n");
writeFileSync("game/sprites/tiles/bridges.ts", `// Generated by scripts/art/bridges-tiles.mjs, then committed. Edit freely.
import type { TileSetDef } from "./tileset";

export const BRIDGES_TILES: TileSetDef = {
  id: ${JSON.stringify(BRIDGES.id)},
  name: ${JSON.stringify(BRIDGES.name)},
  size: ${S},
  palette: ${JSON.stringify(PALETTE, null, 2).replace(/\n/g, "\n  ")},
  fps: ${JSON.stringify(BRIDGES.fps)},
  tiles: {
${body}
  },
};
`);
previewSheet(BRIDGES.id, PALETTE, BRIDGES.tiles, 4);
