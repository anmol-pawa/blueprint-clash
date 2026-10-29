// Tilesets: 16×16 tiles for Old Town (outdoors) and the Drafting Hall (indoors).
// Every tile is a list of 1–4 frames (animated tiles: water, lamps, windows).
// Run: node scripts/art/tiles.mjs   (ART_PREVIEW=<dir> writes contact sheets)
import { writeFileSync } from "node:fs";
import { Layer, previewSheet } from "./paint.mjs";

const S = 16;
const PALETTE = {
  k: "#1a1420", w: "#ffffff", y: "#f0b429", x: "#b5650f", z: "#efe3b8",
  a: "#2f6b3a", b: "#3f8f4a", c: "#62b45a", // grass
  d: "#5f5e69", e: "#8a8993", f: "#b8b7c0", // cobble
  g: "#7a3b2e", h: "#a2523d", i: "#c9735a", // brick
  j: "#2b3656", l: "#44547f", m: "#6b80b0", // slate roof
  n: "#4f3320", o: "#7e552f", p: "#b07f45", // wood
  q: "#2a6fa8", r: "#3f95c9", s: "#8ad0ea", // water
  t: "#1d5532", u: "#2f7a40", v: "#52ab58", // leaves
  A: "#f4f1e6", B: "#d6cfb8", C: "#a89f86", // plaster
  D: "#b53a3a", E: "#e8a8c4", F: "#f6e27a", // flowers
  G: "#6e2530", H: "#a43c45", I: "#d9a441", // rug
  J: "#a8dcf5", K: "#4b7fa6", L: "#33261a", // glass, dark wood
  M: "#1b4a7a", N: "#2f6aa6", O: "#cfe3f5", // blueprint
  P: "#3a3f4d", Q: "#252a36", R: "#7a8196", // iron
};
const R = (s) => [...s];
const GRASS = R("abc"), COBBLE = R("def"), BRICK = R("ghi"), SLATE = R("jlm"), WOOD = R("nop"), LEAF = R("tuv"), WATER = R("qrs"), PLASTER = R("CBA"), IRON = R("QPR"), RUG = R("GHI");

/** Deterministic hash noise in [0, 1). */
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const tile = () => new Layer(S, S);
const fill = (L, ramp, v, seed, spread = 0.22) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) L.set(x, y, L.shade(ramp, v + (hash(x, y, seed) - 0.5) * spread * 2, x, y)); return L; };
const rect = (L, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) L.set(x, y, c); return L; };
const box = (L, x0, y0, x1, y1, c) => { L.line(x0, y0, x1, y0, c).line(x0, y1, x1, y1, c).line(x0, y0, x0, y1, c).line(x1, y0, x1, y1, c); return L; };

// ---------- ground ----------
function grass(seed, flowers = false) {
  const L = fill(tile(), GRASS, 0.55, seed, 0.18);
  for (let i = 0; i < 7; i++) { const x = Math.floor(hash(i, 1, seed) * 15) + 0, y = Math.floor(hash(i, 2, seed) * 14) + 1; L.set(x, y, "a"); L.set(x, y - 1, "c"); }
  if (flowers) for (let i = 0; i < 4; i++) { const x = 2 + Math.floor(hash(i, 5, seed) * 12), y = 2 + Math.floor(hash(i, 6, seed) * 12); const col = ["D", "E", "F", "E"][i]; L.set(x, y, col); L.set(x + 1, y, col); L.set(x, y + 1, col); L.set(x, y, "w"); L.set(x + 1, y + 1, "y"); }
  return L;
}
function cobble(seed, plaza = false) {
  const L = fill(tile(), COBBLE, 0.5, seed, 0.1);
  const rows = plaza ? [0, 8] : [0, 5, 10];
  const h = plaza ? 8 : 5;
  rows.forEach((y0, r) => {
    const off = plaza ? (r % 2 ? 0 : 4) : (r % 2 ? 3 : 0);
    const step = plaza ? 8 : 6;
    for (let x0 = -off; x0 < S; x0 += step) {
      if (x0 >= 0) for (let y = y0; y < Math.min(S, y0 + h); y++) L.set(x0, y, "d");
      for (let x = Math.max(0, x0); x < Math.min(S, x0 + step); x++) { L.set(x, y0, "d"); }
      for (let x = Math.max(0, x0 + 1); x < Math.min(S, x0 + step - 1); x++) L.set(x, y0 + 1, hash(x, y0, seed) > 0.5 ? "f" : "e");
    }
  });
  return L;
}
function water(frame) {
  const L = fill(tile(), WATER, 0.45, 40, 0.05);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const w = Math.sin((x + frame * 4) * 0.8 + y * 0.9) + Math.sin(x * 0.4 - y * 0.7 + frame * 1.6);
    if (w > 1.35) L.set(x, y, "s"); else if (w < -1.4) L.set(x, y, "q");
  }
  return L;
}

// ---------- buildings ----------
function brick(seed = 3) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const row = Math.floor(y / 4), off = row % 2 ? 4 : 0;
    const mortar = y % 4 === 3 || (x + off) % 8 === 7;
    L.set(x, y, mortar ? "g" : hash(Math.floor((x + off) / 8), row, seed) > 0.5 ? "h" : (y % 4 === 0 ? "i" : "h"));
  }
  return L;
}
function roof(edge = false) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const row = Math.floor(y / 4), off = row % 2 ? 4 : 0, sx = (x + off) % 8;
    const scallop = y % 4 === 3 || sx === 7;
    L.set(x, y, scallop ? "j" : y % 4 === 0 ? "m" : "l");
  }
  if (edge) { rect(L, 0, 13, 15, 15, "j"); L.line(0, 12, 15, 12, "m"); for (let x = 0; x < S; x += 2) L.set(x, 15, "k"); }
  return L;
}
function window(lit) {
  const L = brick(3);
  rect(L, 3, 2, 12, 13, "n"); rect(L, 4, 3, 11, 12, lit ? "y" : "K");
  if (!lit) { for (let i = 0; i < 6; i++) L.set(4 + i, 3 + i, "J"); L.set(10, 3, "J"); }
  else { rect(L, 4, 3, 11, 5, "F"); L.set(5, 9, "x"); L.set(6, 9, "x"); }
  L.line(7, 3, 7, 12, "n"); L.line(8, 3, 8, 12, "n"); L.line(4, 7, 11, 7, "n");
  L.line(2, 14, 13, 14, "C"); L.line(2, 15, 13, 15, "B");
  return L;
}
function door() {
  const L = brick(5);
  rect(L, 3, 1, 12, 15, "n"); rect(L, 4, 2, 11, 15, "o");
  for (let x = 4; x < 12; x += 3) L.line(x, 2, x, 15, "n");
  L.line(4, 2, 11, 2, "p"); rect(L, 5, 4, 6, 7, "p"); rect(L, 9, 4, 10, 7, "p");
  L.set(10, 10, "y"); L.set(10, 11, "x");
  rect(L, 2, 15, 13, 15, "C");
  return L;
}
function plasterWall(seed = 9) {
  const L = fill(tile(), PLASTER, 0.7, seed, 0.08);
  for (let x = 0; x < S; x += 5) L.line(x, 0, x, 15, "C");
  L.line(0, 15, 15, 15, "C");
  return L;
}

// ---------- props (transparent background) ----------
const outlined = (L) => L.outline("k");
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
  L.set(7, 3, "w"); L.line(4, 0, 11, 0, "P"); L.set(7, -1, "P");
  if (frame) { L.set(4, 3, "F"); L.set(11, 3, "F"); }
  return outlined(L);
}
function lampBase() { const L = tile(); rect(L, 7, 0, 8, 11, "P"); L.line(7, 0, 7, 11, "R"); rect(L, 5, 12, 10, 15, "Q"); L.line(5, 12, 10, 12, "R"); return outlined(L); }
function fence() { const L = tile(); for (const x of [1, 6, 11]) { rect(L, x, 6, x + 2, 15, "p"); L.line(x, 6, x, 15, "z"); L.set(x + 1, 5, "p"); } rect(L, 0, 8, 15, 9, "o"); rect(L, 0, 12, 15, 12, "o"); return outlined(L); }
function sign() { const L = tile(); rect(L, 7, 8, 8, 15, "n"); rect(L, 2, 2, 13, 9, "p"); rect(L, 3, 3, 12, 8, "z"); box(L, 2, 2, 13, 9, "n"); L.line(4, 5, 11, 5, "o"); L.line(4, 7, 9, 7, "o"); return outlined(L); }
function bench() { const L = tile(); rect(L, 1, 6, 14, 8, "p"); rect(L, 1, 6, 14, 6, "z"); rect(L, 2, 9, 3, 14, "P"); rect(L, 12, 9, 13, 14, "P"); rect(L, 1, 2, 14, 4, "o"); rect(L, 2, 5, 3, 6, "P"); rect(L, 12, 5, 13, 6, "P"); return outlined(L); }
function crate() { const L = tile(); rect(L, 1, 3, 14, 15, "o"); box(L, 1, 3, 14, 15, "n"); L.line(1, 3, 14, 15, "n"); L.line(14, 3, 1, 15, "n"); rect(L, 2, 4, 13, 4, "p"); return outlined(L); }
function flowerbed() { const L = tile(); rect(L, 1, 8, 14, 15, "n"); rect(L, 1, 8, 14, 9, "o"); for (let i = 0; i < 7; i++) { const x = 2 + i * 2, y = 6 + (i % 2) * 2; L.set(x, y + 1, "u"); L.set(x, y, ["D", "E", "F"][i % 3]); L.set(x + 1, y - 1, "u"); } rect(L, 1, 10, 14, 15, "n"); for (let x = 2; x < 14; x += 3) L.set(x, 12, "o"); return outlined(L); }
function hedge() { const L = tile(); L.ellipse(8, 10, 8, 6.5, LEAF); rect(L, 0, 10, 15, 15, "u"); for (let x = 0; x < S; x++) for (let y = 8; y < S; y++) if (hash(x, y, 7) > 0.8) L.set(x, y, y < 12 ? "v" : "t"); L.line(0, 15, 15, 15, "t"); return outlined(L); }
function board(frame) {
  const L = tile(); rect(L, 3, 12, 4, 15, "n"); rect(L, 11, 12, 12, 15, "n"); rect(L, 1, 1, 14, 12, "o"); rect(L, 2, 2, 13, 11, "M");
  for (let x = 3; x < 13; x += 3) L.line(x, 2, x, 11, "N"); for (let y = 4; y < 11; y += 3) L.line(2, y, 13, y, "N");
  L.line(4, 9, 7, 4, "O"); L.line(7, 4, 11, 9, "O"); L.line(4, 9, 11, 9, "O"); if (frame) L.set(11, 3, "w");
  return outlined(L);
}

// ---------- the Drafting Hall (indoors) ----------
function floorWood(seed) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const plank = Math.floor(y / 4);
    const edge = y % 4 === 3 || (x + plank * 5 + seed) % 16 === 0;
    L.set(x, y, edge ? "n" : L.shade(WOOD, 0.55 + (hash(x >> 1, plank, seed) - 0.5) * 0.3 + (x % 5 === 0 && y % 4 === 1 ? 0.12 : 0), x, y));
  }
  return L;
}
function rug(part) {
  const L = tile();
  fill(L, RUG, 0.5, 22, 0.06);
  const t = { c: [], n: [0, 0, 15, 1], s: [0, 14, 15, 15], w: [0, 0, 1, 15], e: [14, 0, 15, 15] }[part];
  if (part !== "c") rect(L, ...t, "G");
  if (part === "c") { for (let i = 0; i < 4; i++) { const o = 3 + i; L.set(8, o + 1, "I"); L.set(o + 1, 8, "I"); L.set(8, 14 - o, "I"); L.set(14 - o, 8, "I"); } L.set(8, 8, "w"); }
  else { const g = { n: [0, 2, 15, 2], s: [0, 13, 15, 13], w: [2, 0, 2, 15], e: [13, 0, 13, 15] }[part]; L.line(...g, "I"); for (let i = 0; i < 16; i += 3) { if (part === "n") L.set(i, 4, "I"); if (part === "s") L.set(i, 11, "I"); if (part === "w") L.set(4, i, "I"); if (part === "e") L.set(11, i, "I"); } }
  return L;
}
function wallPanel() {
  const L = tile();
  rect(L, 0, 0, 15, 15, "o"); rect(L, 0, 0, 15, 3, "n"); L.line(0, 4, 15, 4, "p"); rect(L, 2, 6, 13, 13, "n"); rect(L, 3, 7, 12, 12, "o"); L.line(3, 7, 12, 7, "p"); rect(L, 0, 14, 15, 15, "L"); L.line(0, 14, 15, 14, "n");
  return L;
}
function hallWindow(frame) {
  const L = wallPanel(); rect(L, 2, 0, 13, 12, "p"); rect(L, 3, 1, 12, 11, frame ? "s" : "J"); L.line(7, 1, 7, 11, "p"); L.line(8, 1, 8, 11, "p"); L.line(3, 6, 12, 6, "p");
  for (let i = 0; i < 4; i++) L.set(4 + i, 2 + i, "w"); if (frame) L.set(10, 3, "w");
  rect(L, 1, 12, 14, 13, "o"); L.line(1, 12, 14, 12, "z");
  return L;
}
function bookshelf() {
  const L = tile(); rect(L, 0, 0, 15, 15, "n"); const cols = ["D", "M", "u", "I", "H", "N", "x", "t"];
  for (const y0 of [1, 8]) { rect(L, 1, y0, 14, y0 + 5, "L"); let x = 1; let i = y0; while (x < 14) { const w = 1 + Math.floor(hash(x, y0, 4) * 2.2), hh = 4 + Math.floor(hash(y0, x, 5) * 2); const c = cols[(x * 3 + y0) % cols.length]; rect(L, x, y0 + 5 - hh + 1, Math.min(13, x + w - 1), y0 + 5, c); L.set(x, y0 + 5 - hh + 1, "z"); x += w + (hash(x, i, 6) > 0.85 ? 1 : 0); } rect(L, 0, y0 + 6, 15, y0 + 6, "p"); }
  L.line(0, 15, 15, 15, "L");
  return L;
}
function tableHalf(side) {
  const L = floorWood(side === "l" ? 1 : 2); const x0 = side === "l" ? 3 : 0, x1 = side === "l" ? 15 : 12;
  rect(L, x0, 4, x1, 12, "o"); rect(L, x0, 4, x1, 5, "p"); rect(L, x0, 12, x1, 13, "n");
  const lx = side === "l" ? 4 : 11; rect(L, lx, 13, lx + 1, 15, "L");
  // a blueprint unrolled across both halves
  const b0 = side === "l" ? 6 : 0, b1 = side === "l" ? 15 : 9; rect(L, b0, 6, b1, 11, "M");
  for (let x = b0; x <= b1; x += 3) L.line(x, 6, x, 11, "N"); for (let y = 7; y <= 11; y += 2) L.line(b0, y, b1, y, "N");
  if (side === "l") { L.line(8, 10, 11, 7, "O"); L.line(11, 7, 15, 10, "O"); L.line(8, 10, 15, 10, "O"); } else { L.set(3, 8, "O"); L.set(4, 8, "O"); L.set(5, 9, "O"); L.line(6, 7, 8, 7, "O"); rect(L, 10, 8, 12, 8, "y"); L.set(12, 8, "x"); }
  return L;
}
function chalkboard(part) {
  const L = wallPanel(); const x0 = part === "l" ? 3 : 0, x1 = part === "l" ? 15 : 12; rect(L, x0, 0, x1, 12, "n"); rect(L, part === "l" ? 4 : 0, 1, part === "l" ? 15 : 11, 11, "t");
  const c = "A";
  if (part === "l") { box(L, 5, 2, 11, 5, c); L.line(5, 4, 11, 4, c); L.line(8, 5, 8, 8, c); L.line(11, 5, 12, 8, c); L.line(12, 8, 15, 8, c); }
  else { box(L, 3, 3, 9, 6, c); L.line(3, 5, 9, 5, c); L.line(0, 8, 3, 8, c); L.line(6, 6, 6, 9, c); L.set(10, 9, c); L.set(11, 9, c); }
  rect(L, x0, 12, x1, 12, "p");
  return L;
}
function plant() { const L = floorWood(3); const p = tile(); p.poly([[4, 9], [11, 9], [10, 15], [5, 15]], ["D", "H", "i"], (x) => 0.9 - (x - 4) / 10); p.ellipse(8, 5, 6, 5, LEAF); for (const [x, y] of [[4, 4], [11, 3], [8, 7], [6, 2]]) p.set(x, y, "v"); outlined(p); L.draw(p); return L; }
function wallLamp(frame) { const L = wallPanel(); rect(L, 7, 4, 8, 9, "P"); rect(L, 5, 1, 10, 6, frame ? "F" : "y"); box(L, 5, 1, 10, 6, "Q"); if (frame) { L.set(4, 3, "F"); L.set(11, 3, "F"); } return L; }
function doorMat() { const L = floorWood(4); rect(L, 2, 3, 13, 12, "D"); box(L, 2, 3, 13, 12, "G"); for (let x = 4; x < 12; x += 2) L.line(x, 5, x, 10, "H"); return L; }
function stairsDown() { const L = tile(); for (let i = 0; i < 4; i++) { rect(L, 0, i * 4, 15, i * 4 + 3, "n"); L.line(0, i * 4, 15, i * 4, "p"); rect(L, 0, i * 4 + 3, 15, i * 4 + 3, "L"); } return L; }

// ---------- sets ----------
const OLD_TOWN = {
  id: "old-town", name: "Old Town tiles", fps: { water: 3, "lamp-top": 4, window: 2, board: 2 },
  tiles: {
    grass: [grass(1)], "grass-2": [grass(2)], "grass-flowers": [grass(3, true)], path: [cobble(1)], plaza: [cobble(2, true)],
    water: [0, 1, 2, 3].map(water), "brick-wall": [brick()], "window-dark": [window(false)], window: [window(false), window(true)], door: [door()],
    "roof-slate": [roof()], "roof-eave": [roof(true)], "plaster-wall": [plasterWall()],
    "tree-trunk": [treeTrunk()], "tree-canopy-top": [treeCanopy("top")], "tree-canopy-bottom": [treeCanopy("bottom")],
    "lamp-top": [lampTop(0), lampTop(1)], "lamp-base": [lampBase()], fence: [fence()], sign: [sign()], bench: [bench()], crate: [crate()],
    flowerbed: [flowerbed()], hedge: [hedge()], board: [board(0), board(1)],
  },
};
const HALL = {
  id: "drafting-hall", name: "Drafting Hall tiles", fps: { "wall-lamp": 4, "hall-window": 1 },
  tiles: {
    "floor-wood": [floorWood(1)], "floor-wood-2": [floorWood(2)], "rug-center": [rug("c")], "rug-n": [rug("n")], "rug-s": [rug("s")], "rug-w": [rug("w")], "rug-e": [rug("e")],
    "wall-panel": [wallPanel()], "hall-window": [hallWindow(0), hallWindow(1)], bookshelf: [bookshelf()], "table-l": [tableHalf("l")], "table-r": [tableHalf("r")],
    "chalkboard-l": [chalkboard("l")], "chalkboard-r": [chalkboard("r")], plant: [plant()], "wall-lamp": [wallLamp(0), wallLamp(1)], "door-mat": [doorMat()], stairs: [stairsDown()],
  },
};

function emitSet(file, set, exportName) {
  const body = Object.entries(set.tiles).map(([k, frames]) => `    ${JSON.stringify(k)}: [\n${frames.map((f) => `      [\n${f.rows().map((r) => `        ${JSON.stringify(r)},`).join("\n")}\n      ],`).join("\n")}\n    ],`).join("\n");
  writeFileSync(file, `// Generated by scripts/art/tiles.mjs, then committed. Edit freely.
import type { TileSetDef } from "./tileset";

export const ${exportName}: TileSetDef = {
  id: ${JSON.stringify(set.id)},
  name: ${JSON.stringify(set.name)},
  size: ${S},
  palette: ${JSON.stringify(PALETTE, null, 2).replace(/\n/g, "\n  ")},
  fps: ${JSON.stringify(set.fps)},
  tiles: {
${body}
  },
};
`);
  previewSheet(set.id, PALETTE, set.tiles, 4);
}
emitSet("game/sprites/tiles/old-town.ts", OLD_TOWN, "OLD_TOWN_TILES");
emitSet("game/sprites/tiles/drafting-hall.ts", HALL, "DRAFTING_HALL_TILES");
