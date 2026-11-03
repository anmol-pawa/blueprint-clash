// SOLID Square tileset: a civic square of limestone, copper-green roofs, marble paving,
// pillars (five principles, one column each) and purple banners.
// Run: node scripts/art/solid-square.mjs   (ART_PREVIEW=<dir> writes contact sheets)
import { writeFileSync } from "node:fs";
import { Layer, previewSheet } from "./paint.mjs";

const S = 16;
const PALETTE = {
  k: "#1a1420", w: "#ffffff", y: "#f0b429", x: "#b5650f", z: "#efe3b8",
  a: "#2f6b3a", b: "#3f8f4a", c: "#62b45a", // grass
  d: "#6a6a78", e: "#9a9aa8", f: "#c4c4d0", // path stone
  n: "#4f3320", o: "#7e552f", p: "#b07f45", // wood
  q: "#2a6fa8", r: "#3f95c9", s: "#8ad0ea", // water
  t: "#1d5532", u: "#2f7a40", v: "#52ab58", // leaves
  D: "#b53a3a", E: "#e8a8c4", F: "#f6e27a", // flowers
  P: "#3a3f4d", Q: "#252a36", R: "#7a8196", // iron
  1: "#1f5a5a", 2: "#2f8a7a", 3: "#6fc2a8", // copper roof
  4: "#a29a86", 5: "#d2cab4", 6: "#f1ecdc", // limestone
  7: "#8e92a8", 8: "#c9cddb", 9: "#eef0f7", // marble
  A: "#3b2160", B: "#6a3fa0", C: "#a98be0", // banner
  J: "#a8dcf5", K: "#4b7fa6", L: "#33261a", // glass
  M: "#1b4a7a", N: "#2f6aa6", O: "#cfe3f5", // blueprint
};
const R = (s) => [...s];
const GRASS = R("abc"), PATH = R("def"), LEAF = R("tuv");

const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const tile = () => new Layer(S, S);
const fill = (L, ramp, v, seed, spread = 0.22) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) L.set(x, y, L.shade(ramp, v + (hash(x, y, seed) - 0.5) * spread * 2, x, y)); return L; };
const rect = (L, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) L.set(x, y, c); return L; };
const box = (L, x0, y0, x1, y1, c) => { L.line(x0, y0, x1, y0, c).line(x0, y1, x1, y1, c).line(x0, y0, x0, y1, c).line(x1, y0, x1, y1, c); return L; };
const outlined = (L) => L.outline("k");

function grass(seed, flowers = false) {
  const L = fill(tile(), GRASS, 0.55, seed, 0.18);
  for (let i = 0; i < 7; i++) { const x = Math.floor(hash(i, 1, seed) * 15), y = Math.floor(hash(i, 2, seed) * 14) + 1; L.set(x, y, "a"); L.set(x, y - 1, "c"); }
  if (flowers) for (let i = 0; i < 4; i++) { const x = 2 + Math.floor(hash(i, 5, seed) * 12), y = 2 + Math.floor(hash(i, 6, seed) * 12); const col = ["D", "E", "F", "E"][i]; L.set(x, y, col); L.set(x + 1, y, col); L.set(x, y + 1, col); L.set(x, y, "w"); L.set(x + 1, y + 1, "y"); }
  return L;
}
// a flagstone path: big rectangular slabs with offset joints
function path(seed) {
  const L = fill(tile(), PATH, 0.55, seed, 0.08);
  for (const [i, y0] of [0, 8].entries()) {
    const off = i ? 4 : 0;
    for (let x = 0; x < S; x++) L.set(x, y0, "d");
    for (let y = y0; y < y0 + 8; y++) { L.set((off + 0) % S, y, "d"); L.set((off + 8) % S, y, "d"); }
    for (let x = 1; x < S; x++) if (x % 8 !== off % 8) L.set(x, y0 + 1, hash(x, y0, seed) > 0.5 ? "f" : "e");
  }
  return L;
}
// the marble plaza: a checkerboard of two marble tones, each slab bevelled
function plaza() {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dark = (x >> 3) + (y >> 3) & 1;
    const lx = x % 8, ly = y % 8;
    let c = dark ? "8" : "9";
    if (lx === 0 || ly === 0) c = dark ? "7" : "8";
    else if (hash(x, y, 11) > 0.93) c = dark ? "7" : "8";
    L.set(x, y, c);
  }
  return L;
}
// one quarter of a round basin set into the plaza (stone rim on the outer sides)
function basin(part, frame) {
  const L = plaza();
  const left = part === "tl" || part === "bl", top = part === "tl" || part === "tr";
  const x0 = left ? 3 : 0, x1 = left ? 15 : 12, y0 = top ? 3 : 0, y1 = top ? 15 : 12;
  rect(L, x0, y0, x1, y1, "5");
  // rim highlight and shadow
  rect(L, left ? x0 : x1 - 1, y0, left ? x0 + 1 : x1, y1, "4");
  rect(L, x0, top ? y0 : y1 - 1, x1, top ? y0 + 1 : y1, "4");
  const wx0 = left ? x0 + 2 : x0, wx1 = left ? x1 : x1 - 2, wy0 = top ? y0 + 2 : y0, wy1 = top ? y1 : y1 - 2;
  for (let y = wy0; y <= wy1; y++) for (let x = wx0; x <= wx1; x++) {
    const w = Math.sin((x + frame * 3 + (left ? 0 : 6)) * 0.9 + y * 0.8) + Math.sin(x * 0.5 - y * 0.6 + frame * 1.5);
    L.set(x, y, w > 1.2 ? "s" : w < -1.2 ? "q" : "r");
  }
  // a little jet of spray at the inner corner
  const jx = left ? 15 : 0, jy = top ? 15 : 0;
  L.set(jx, jy, "w");
  if (frame % 2) { L.set(jx + (left ? -1 : 1), jy + (top ? -1 : 1), "s"); L.set(jx, jy + (top ? -2 : 2), "s"); }
  return L;
}

// ---------- the Principle Hall ----------
function copperRoof(edge = false) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const row = Math.floor(y / 4), off = row % 2 ? 4 : 0, sx = (x + off) % 8;
    const seam = y % 4 === 3 || sx === 7;
    L.set(x, y, seam ? "1" : y % 4 === 0 ? "3" : "2");
  }
  if (edge) { rect(L, 0, 13, 15, 15, "1"); L.line(0, 12, 15, 12, "3"); for (let x = 0; x < S; x += 2) L.set(x, 15, "k"); }
  return L;
}
function limestone(seed = 4) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const row = Math.floor(y / 5), off = row % 2 ? 5 : 0;
    const mortar = y % 5 === 4 || (x + off) % 10 === 9;
    L.set(x, y, mortar ? "4" : hash(Math.floor((x + off) / 10), row, seed) > 0.5 ? "5" : y % 5 === 0 ? "6" : "5");
  }
  return L;
}
function archWindow(frame) {
  const L = limestone(4);
  rect(L, 4, 4, 11, 14, "n"); rect(L, 5, 5, 10, 13, frame ? "s" : "K");
  rect(L, 5, 3, 10, 4, "n"); L.set(4, 4, "4"); L.set(11, 4, "4");
  L.line(7, 5, 7, 13, "n"); L.line(8, 5, 8, 13, "n"); L.line(5, 9, 10, 9, "n");
  for (let i = 0; i < 4; i++) L.set(5 + i, 6 + i, frame ? "w" : "J");
  L.line(3, 15, 12, 15, "4"); L.line(2, 3, 13, 3, "6");
  return L;
}
function column() {
  const L = limestone(8);
  rect(L, 3, 0, 12, 15, "5");
  rect(L, 3, 0, 4, 15, "6"); rect(L, 11, 0, 12, 15, "4");
  for (const x of [6, 7, 8, 9]) for (let y = 1; y < 15; y++) if ((x + y) % 2 === 0 && x !== 7) L.set(x, y, "5");
  L.line(7, 0, 7, 15, "4"); L.line(9, 0, 9, 15, "6");
  rect(L, 1, 0, 14, 1, "6"); L.line(1, 1, 14, 1, "4"); // capital
  rect(L, 1, 14, 14, 15, "4"); L.line(1, 14, 14, 14, "6"); // base
  L.line(0, 0, 0, 15, "k"); L.line(15, 0, 15, 15, "k");
  return L;
}
function banner(frame) {
  const L = limestone(6);
  rect(L, 2, 0, 13, 1, "L"); // rod
  rect(L, 4, 2, 11, 12, "B"); rect(L, 4, 2, 5, 12, "C"); rect(L, 10, 2, 11, 12, "A");
  // the swallow-tail hem sways a pixel between frames
  const sway = frame ? 1 : 0;
  for (let i = 0; i < 4; i++) L.set(4 + i * 2 + sway, 13, "A");
  L.set(5 + sway, 14, "A"); L.set(9 + sway, 14, "A");
  // emblem: five dots (one per principle) around a square
  box(L, 6, 5, 9, 8, "F");
  for (const [x, y] of [[5, 4], [10, 4], [5, 9], [10, 9], [7, 10]]) L.set(x, y, "F");
  return L;
}
function archDoor() {
  const L = limestone(5);
  rect(L, 2, 3, 13, 15, "4"); rect(L, 3, 2, 12, 3, "4"); rect(L, 4, 1, 11, 1, "4");
  rect(L, 3, 4, 12, 15, "n"); rect(L, 4, 4, 11, 15, "o"); rect(L, 4, 3, 11, 3, "o"); rect(L, 5, 2, 10, 2, "o");
  for (let x = 4; x < 12; x += 3) L.line(x, 3, x, 15, "n");
  L.line(4, 3, 11, 3, "p"); rect(L, 5, 6, 6, 9, "p"); rect(L, 9, 6, 10, 9, "p");
  L.set(10, 12, "y"); L.set(10, 13, "x");
  rect(L, 1, 15, 14, 15, "4");
  return L;
}

// ---------- props (transparent background) ----------
function treeTrunk() { const L = tile(); rect(L, 6, 0, 9, 15, "n"); rect(L, 6, 0, 7, 15, "o"); L.line(6, 6, 7, 8, "n"); rect(L, 4, 13, 11, 15, "n"); L.line(4, 14, 5, 14, "o"); return outlined(L); }
function treeCanopy(part) {
  const L = tile();
  L.ellipse(8, part === "top" ? 11 : 4, 8, part === "top" ? 8 : 9, LEAF, { bias: 0.05 });
  if (part === "top") L.ellipse(8, 14, 8, 8, LEAF);
  for (let i = 0; i < 8; i++) { const x = 2 + Math.floor(hash(i, 3, 1) * 12), y = 1 + Math.floor(hash(i, 4, 1) * 13); if (L.get(x, y) !== ".") L.set(x, y, i % 2 ? "v" : "t"); }
  return outlined(L);
}
function lampTop(frame) {
  const L = tile();
  rect(L, 7, 5, 8, 15, "P"); L.line(7, 5, 7, 15, "R"); rect(L, 5, 1, 10, 6, "Q"); rect(L, 6, 2, 9, 5, frame ? "F" : "y");
  L.set(7, 3, "w"); L.line(4, 0, 11, 0, "P");
  if (frame) { L.set(4, 3, "F"); L.set(11, 3, "F"); }
  return outlined(L);
}
function lampBase() { const L = tile(); rect(L, 7, 0, 8, 11, "P"); L.line(7, 0, 7, 11, "R"); rect(L, 5, 12, 10, 15, "Q"); L.line(5, 12, 10, 12, "R"); return outlined(L); }
function sign() { const L = tile(); rect(L, 7, 8, 8, 15, "n"); rect(L, 2, 2, 13, 9, "p"); rect(L, 3, 3, 12, 8, "z"); box(L, 2, 2, 13, 9, "n"); L.line(4, 5, 11, 5, "o"); L.line(4, 7, 9, 7, "o"); return outlined(L); }
function bench() { const L = tile(); rect(L, 1, 6, 14, 8, "5"); rect(L, 1, 6, 14, 6, "6"); rect(L, 2, 9, 3, 14, "4"); rect(L, 12, 9, 13, 14, "4"); rect(L, 1, 2, 14, 4, "4"); rect(L, 2, 5, 3, 6, "4"); rect(L, 12, 5, 13, 6, "4"); return outlined(L); }
function flowerbed() { const L = tile(); rect(L, 1, 8, 14, 15, "5"); rect(L, 1, 8, 14, 9, "6"); rect(L, 1, 14, 14, 15, "4"); for (let i = 0; i < 7; i++) { const x = 2 + i * 2, y = 5 + (i % 2) * 2; L.set(x, y + 2, "u"); L.set(x, y + 1, "u"); L.set(x, y, ["D", "E", "F"][i % 3]); L.set(x + 1, y - 1, "u"); } return outlined(L); }
// a clipped hedge cube: SOLID is about tidy boundaries
function topiary() {
  const L = tile();
  rect(L, 2, 3, 13, 12, "u"); rect(L, 2, 3, 13, 5, "v"); rect(L, 2, 11, 13, 12, "t");
  for (let x = 2; x < 14; x++) for (let y = 3; y < 13; y++) if (hash(x, y, 7) > 0.82) L.set(x, y, y < 8 ? "c" : "t");
  rect(L, 5, 13, 10, 15, "L"); L.line(5, 13, 5, 15, "n");
  return outlined(L);
}
// a statue of scales on a plinth: trade-offs, weighed
function statue() {
  const L = tile();
  rect(L, 3, 11, 12, 15, "4"); rect(L, 3, 11, 12, 12, "6"); rect(L, 4, 13, 11, 13, "5");
  rect(L, 7, 4, 8, 11, "P"); L.line(7, 4, 7, 11, "R");
  L.line(2, 4, 13, 4, "R"); L.set(7, 3, "y"); L.set(8, 3, "y");
  L.line(2, 5, 2, 8, "R"); L.line(13, 5, 13, 8, "R");
  rect(L, 0, 8, 4, 9, "y"); rect(L, 11, 9, 15, 10, "y"); // pans hang at different heights: the scale is not level
  L.set(0, 9, "x"); L.set(15, 10, "x");
  return outlined(L);
}
function board(frame) {
  const L = tile(); rect(L, 3, 12, 4, 15, "n"); rect(L, 11, 12, 12, 15, "n"); rect(L, 1, 1, 14, 12, "o"); rect(L, 2, 2, 13, 11, "M");
  for (let x = 3; x < 13; x += 3) L.line(x, 2, x, 11, "N"); for (let y = 4; y < 11; y += 3) L.line(2, y, 13, y, "N");
  for (const [x, y] of [[4, 4], [7, 4], [10, 4]]) { rect(L, x, y, x + 1, y + 1, "O"); }
  L.line(4, 9, 11, 9, "O"); if (frame) L.set(11, 3, "w");
  return outlined(L);
}

const SOLID_SQUARE = {
  id: "solid-square", name: "SOLID Square tiles", fps: { "basin-tl": 3, "basin-tr": 3, "basin-bl": 3, "basin-br": 3, "lamp-top": 4, banner: 2, window: 2, board: 2 },
  tiles: {
    grass: [grass(1)], "grass-2": [grass(2)], "grass-flowers": [grass(3, true)], path: [path(1)], plaza: [plaza()],
    "basin-tl": [0, 1, 2, 3].map((f) => basin("tl", f)), "basin-tr": [0, 1, 2, 3].map((f) => basin("tr", f)),
    "basin-bl": [0, 1, 2, 3].map((f) => basin("bl", f)), "basin-br": [0, 1, 2, 3].map((f) => basin("br", f)),
    "roof-copper": [copperRoof()], "roof-eave": [copperRoof(true)], "stone-wall": [limestone()], window: [archWindow(0), archWindow(1)],
    column: [column()], banner: [banner(0), banner(1)], "arch-door": [archDoor()],
    "tree-trunk": [treeTrunk()], "tree-canopy-top": [treeCanopy("top")], "tree-canopy-bottom": [treeCanopy("bottom")],
    "lamp-top": [lampTop(0), lampTop(1)], "lamp-base": [lampBase()], sign: [sign()], bench: [bench()], flowerbed: [flowerbed()],
    topiary: [topiary()], statue: [statue()], board: [board(0), board(1)],
  },
};

const body = Object.entries(SOLID_SQUARE.tiles).map(([k, frames]) => `    ${JSON.stringify(k)}: [\n${frames.map((f) => `      [\n${f.rows().map((r) => `        ${JSON.stringify(r)},`).join("\n")}\n      ],`).join("\n")}\n    ],`).join("\n");
writeFileSync("game/sprites/tiles/solid-square.ts", `// Generated by scripts/art/solid-square.mjs, then committed. Edit freely.
import type { TileSetDef } from "./tileset";

export const SOLID_SQUARE_TILES: TileSetDef = {
  id: ${JSON.stringify(SOLID_SQUARE.id)},
  name: ${JSON.stringify(SOLID_SQUARE.name)},
  size: ${S},
  palette: ${JSON.stringify(PALETTE, null, 2).replace(/\n/g, "\n  ")},
  fps: ${JSON.stringify(SOLID_SQUARE.fps)},
  tiles: {
${body}
  },
};
`);
previewSheet(SOLID_SQUARE.id, PALETTE, SOLID_SQUARE.tiles, 4);
