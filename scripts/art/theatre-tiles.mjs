// Behavioural Theatre tileset: a playhouse district where patterns "perform". Plum plaster walls and slate roofs,
// red velvet curtains and carpet, gilded columns, a chasing-bulb marquee, plank stage boards with footlights.
// Run: node scripts/art/theatre-tiles.mjs   (ART_PREVIEW=<dir> writes contact sheets)
import { writeFileSync } from "node:fs";
import { Layer, previewSheet } from "./paint.mjs";

const S = 16;
const PALETTE = {
  k: "#14161f", w: "#ffffff", y: "#f0b429", z: "#fff1c2",
  a: "#5a4a63", b: "#7d6a88", c: "#a893b3", // plaza paving (dusky violet stone)
  n: "#4a301e", o: "#7a5230", p: "#b07f45", // stage planks
  1: "#5c1424", 2: "#9c2236", 3: "#d4445a", // velvet red: shadow, body, light
  4: "#8a6420", 5: "#d9a52c", 6: "#fbe27a", // gilt
  7: "#2a2540", 8: "#463d66", 9: "#6b5f94", // slate roof / plum wall shade
  s: "#e6d6e8", t: "#b9a2c2", // plaster wall
  P: "#33384a", Q: "#1f2330", R: "#737b92", // iron
  L: "#2b2a3a", J: "#ffd35a", // window glass, lamp glow
  g: "#3a8a80", h: "#6cc4b3", // teal accent (masks, bunting)
};
const R = (s) => [...s];
const PAVE = R("abc"), WALL = R("tsz"), VELVET = R("123");

const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const tile = () => new Layer(S, S);
const fill = (L, ramp, v, seed, spread = 0.2) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) L.set(x, y, L.shade(ramp, v + (hash(x, y, seed) - 0.5) * spread * 2, x, y)); return L; };
const rect = (L, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) L.set(x, y, c); return L; };
const outlined = (L) => L.outline("k");

// ---------- ground ----------
function plaza(seed) {
  const L = fill(tile(), PAVE, 0.55, seed, 0.12);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const row = Math.floor(y / 8), off = row ? 4 : 0;
    if (y % 8 === 7 || (x + off) % 8 === 7) L.set(x, y, "a");
    else if (y % 8 === 0) L.set(x, y, "c");
  }
  if (seed === 2) { L.set(3, 4, "a"); L.set(11, 12, "a"); L.set(12, 3, "c"); }
  return L;
}
// stage boards: long planks running across, nail heads, worn tape mark
function stageFloor(seed) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const board = Math.floor(y / 4);
    L.set(x, y, y % 4 === 3 ? "n" : hash(board, seed, 5) > 0.5 ? "p" : "o");
  }
  for (const [x, y] of [[1, 1], [14, 1], [1, 5], [14, 5], [1, 9], [14, 9], [1, 13], [14, 13]]) L.set(x, y, "n");
  if (seed === 2) { L.line(5, 6, 10, 6, "y"); L.line(7, 4, 7, 8, "y"); } // spike mark
  return L;
}
// red carpet with a gilt border stripe along the top and bottom
function carpet(seed) {
  const L = fill(tile(), VELVET, 0.5, seed, 0.1);
  L.line(0, 0, 15, 0, "5"); L.line(0, 1, 15, 1, "4"); L.line(0, 14, 15, 14, "4"); L.line(0, 15, 15, 15, "5");
  for (let x = 2; x < S; x += 6) { L.set(x, 7, "6"); L.set(x + 1, 8, "5"); L.set(x, 9, "6"); L.set(x - 1, 8, "5"); }
  return L;
}
// the stage lip: boards above, a row of footlight bulbs that chase left to right
function footlights(frame) {
  const L = stageFloor(1);
  rect(L, 0, 9, 15, 15, "7"); L.line(0, 9, 15, 9, "6"); L.line(0, 10, 15, 10, "4");
  for (let i = 0; i < 4; i++) {
    const x = 1 + i * 4, lit = (i + frame) % 4 < 2;
    rect(L, x, 11, x + 2, 13, lit ? "J" : "5"); if (lit) L.set(x + 1, 11, "w"); L.set(x, 14, "Q");
  }
  return L;
}

// ---------- the playhouse ----------
function wall(seed = 4) {
  const L = fill(tile(), WALL, 0.55, seed, 0.1);
  for (let y = 0; y < S; y += 8) L.line(0, y, 15, y, "t"); // string course
  for (let x = 0; x < S; x += 8) L.line(x, 0, x, 7, "t"); // ashlar joints, offset per course
  for (let x = 4; x < S; x += 8) L.line(x, 8, x, 15, "t");
  return L;
}
function roofTile(edge = false) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const row = Math.floor(y / 4), off = row % 2 ? 4 : 0, cx = (x + off) % 8;
    L.set(x, y, y % 4 === 3 ? "7" : cx === 7 ? "7" : cx < 2 ? "9" : "8");
  }
  if (edge) { rect(L, 0, 12, 15, 15, "7"); L.line(0, 12, 15, 12, "9"); for (let x = 0; x < S; x += 2) L.set(x, 15, "k"); }
  return L;
}
function window_(frame) {
  const L = wall(4);
  rect(L, 3, 3, 12, 13, "P"); rect(L, 4, 4, 11, 12, "L");
  for (let y = 5; y <= 11; y++) for (let x = 5; x <= 10; x++) if (hash(x, y, frame + 2) > 0.72) L.set(x, y, "J");
  L.line(7, 4, 7, 12, "P"); L.line(8, 4, 8, 12, "P"); L.line(4, 8, 11, 8, "P");
  rect(L, 2, 14, 13, 14, "5"); rect(L, 4, 2, 11, 2, "2"); // gilt sill, red pediment bar
  return L;
}
// stage door: studded red door under a gilt lintel with a star
function door() {
  const L = wall(6);
  rect(L, 3, 2, 12, 15, "Q"); rect(L, 4, 3, 11, 15, "2"); rect(L, 4, 3, 5, 15, "3");
  for (let x = 7; x <= 11; x += 2) L.line(x, 3, x, 15, "1");
  rect(L, 3, 1, 12, 2, "5"); L.line(3, 1, 12, 1, "6");
  L.set(10, 10, "6"); L.set(10, 11, "6"); L.set(7, 6, "6");
  return L;
}
// marquee: dark board with chasing bulbs round the rim
function marquee(frame) {
  const L = tile();
  rect(L, 0, 2, 15, 13, "5"); rect(L, 1, 3, 14, 12, "Q"); rect(L, 0, 2, 15, 2, "6");
  for (let i = 0; i < 16; i++) { const lit = (i + frame) % 3 === 0; const c = lit ? "z" : "4"; L.set(i, 3, c); L.set(i, 12, c); }
  for (let i = 4; i < 12; i++) { const lit = (i + frame) % 3 === 0; L.set(0, i, lit ? "z" : "4"); L.set(15, i, lit ? "z" : "4"); }
  // two tiny masks: one smile, one frown
  rect(L, 3, 5, 6, 9, "6"); L.set(4, 6, "Q"); L.set(5, 6, "Q"); L.line(4, 8, 5, 8, "Q"); L.set(3, 7, "Q"); L.set(6, 7, "Q");
  rect(L, 9, 5, 12, 9, "h"); L.set(10, 6, "Q"); L.set(11, 6, "Q"); L.set(10, 7, "Q"); L.set(11, 7, "Q"); L.line(10, 9, 11, 9, "Q"); L.set(9, 8, "Q"); L.set(12, 8, "Q");
  return L;
}
// velvet curtain: vertical folds in three parts so a hall can hang a full drape
function curtain(part) {
  const L = tile();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const fold = Math.sin(((x + part * 5) / 16) * Math.PI * 4);
    L.set(x, y, fold > 0.55 ? "3" : fold > -0.35 ? "2" : "1");
  }
  if (part === 0) { rect(L, 0, 0, 1, 15, "4"); L.line(2, 0, 2, 15, "1"); } // left edge: gilt trim
  if (part === 2) { rect(L, 14, 0, 15, 15, "4"); L.line(13, 0, 13, 15, "1"); }
  L.line(0, 0, 15, 0, "5"); L.line(0, 1, 15, 1, "4"); // valance bar
  return L;
}
// the pelmet: swagged top edge in a gilt fringe, for the top of the drape
function pelmet() {
  const L = tile();
  for (let y = 0; y < 10; y++) for (let x = 0; x < S; x++) {
    const sag = 4 + Math.round(Math.abs(Math.sin((x / 16) * Math.PI * 2)) * 4);
    if (y <= sag) L.set(x, y, y > sag - 2 ? "1" : y < 2 ? "3" : "2");
    if (y === sag + 1 && x % 2 === 0) L.set(x, y, "5");
  }
  return L;
}
// gilded column (top capital and base shaft) in two tiles so it stands any height
function columnTop() { const L = tile(); rect(L, 2, 0, 13, 3, "5"); L.line(2, 0, 13, 0, "6"); L.line(2, 3, 13, 3, "4"); rect(L, 4, 4, 11, 15, "s"); rect(L, 4, 4, 5, 15, "z"); rect(L, 10, 4, 11, 15, "t"); return outlined(L); }
function columnBase() { const L = tile(); rect(L, 4, 0, 11, 9, "s"); rect(L, 4, 0, 5, 9, "z"); rect(L, 10, 0, 11, 9, "t"); rect(L, 2, 10, 13, 12, "5"); L.line(2, 10, 13, 10, "6"); rect(L, 1, 13, 14, 15, "t"); L.line(1, 13, 14, 13, "s"); return outlined(L); }

// ---------- props (transparent) ----------
// a spot on a stand throwing a soft cone that pulses
function spotlight(frame) {
  const L = tile();
  rect(L, 7, 8, 8, 15, "P"); L.line(3, 15, 12, 15, "R");
  rect(L, 4, 3, 10, 8, "Q"); rect(L, 4, 3, 10, 3, "R"); rect(L, 10, 4, 11, 7, frame ? "J" : "y");
  const out = outlined(L);
  for (let i = 0; i < 4; i++) { const x = 12 + i; if (x < S) for (let y = 1 + i; y <= 10 - i; y++) if (hash(x, y, frame) > 0.35) out.set(x, y, "z"); }
  return out;
}
function seats() {
  const L = tile();
  for (const x0 of [0, 8]) { rect(L, x0 + 1, 4, x0 + 6, 9, "2"); rect(L, x0 + 1, 4, x0 + 6, 5, "3"); rect(L, x0 + 1, 9, x0 + 6, 9, "1"); rect(L, x0 + 1, 10, x0 + 6, 13, "1"); rect(L, x0 + 1, 10, x0 + 1, 13, "2"); rect(L, x0 + 6, 10, x0 + 6, 13, "n"); }
  return outlined(L);
}
// a poster on an A-frame easel
function poster() { const L = tile(); rect(L, 3, 1, 12, 11, "s"); rect(L, 4, 2, 11, 10, "2"); L.line(5, 4, 10, 4, "6"); L.line(5, 6, 10, 6, "z"); L.line(5, 8, 8, 8, "z"); L.set(10, 8, "6"); L.line(4, 11, 2, 15, "n"); L.line(11, 11, 13, 15, "n"); L.line(7, 11, 8, 15, "o"); return outlined(L); }
function boothTop() { const L = tile(); rect(L, 1, 6, 14, 15, "2"); rect(L, 1, 6, 14, 8, "3"); for (let x = 1; x < 15; x += 3) rect(L, x, 6, x + 1, 8, "z"); L.line(0, 5, 15, 5, "5"); L.line(0, 4, 15, 4, "6"); return outlined(L); }
function boothFront() { const L = tile(); rect(L, 1, 0, 14, 15, "2"); rect(L, 3, 2, 12, 8, "L"); rect(L, 3, 2, 12, 2, "6"); rect(L, 5, 4, 10, 7, "J"); rect(L, 2, 9, 13, 10, "5"); L.line(2, 9, 13, 9, "6"); rect(L, 1, 11, 14, 15, "1"); return outlined(L); }
function trunk() { const L = tile(); rect(L, 1, 5, 14, 14, "o"); rect(L, 1, 5, 14, 7, "p"); rect(L, 1, 8, 14, 8, "n"); rect(L, 1, 5, 2, 14, "5"); rect(L, 13, 5, 14, 14, "5"); rect(L, 7, 8, 8, 10, "6"); L.line(1, 14, 14, 14, "n"); return outlined(L); }
// comedy/tragedy masks on a sign post
function sign() { const L = tile(); rect(L, 7, 8, 8, 15, "n"); rect(L, 1, 1, 14, 9, "7"); rect(L, 2, 2, 13, 8, "Q"); rect(L, 3, 3, 6, 7, "6"); L.set(4, 4, "Q"); L.set(5, 4, "Q"); L.line(4, 6, 5, 6, "Q"); rect(L, 9, 3, 12, 7, "h"); L.set(10, 4, "Q"); L.set(11, 4, "Q"); L.line(10, 6, 11, 6, "Q"); L.set(9, 6, "Q"); L.set(12, 6, "Q"); return outlined(L); }
function lampTop(frame) { const L = tile(); rect(L, 7, 5, 8, 15, "P"); L.line(7, 5, 7, 15, "R"); rect(L, 5, 1, 10, 6, "Q"); rect(L, 6, 2, 9, 5, frame ? "J" : "y"); L.set(7, 3, "w"); L.line(4, 0, 11, 0, "5"); return outlined(L); }
function lampBase() { const L = tile(); rect(L, 7, 0, 8, 11, "P"); L.line(7, 0, 7, 11, "R"); rect(L, 5, 12, 10, 15, "Q"); L.line(5, 12, 10, 12, "R"); return outlined(L); }
// festival bunting strung along a wall, swaying
function bunting(frame) {
  const L = tile();
  const cols = ["3", "5", "h"];
  for (let x = 0; x < S; x++) L.set(x, 1 + Math.round(Math.sin((x / 16) * Math.PI) * 2) + (frame ? 1 : 0) * (x % 2), "P");
  for (let i = 0; i < 4; i++) { const x = 1 + i * 4, y = 3 + Math.round(Math.sin(((x + 1) / 16) * Math.PI) * 2); L.poly([[x, y], [x + 3, y], [x + 1.5, y + 4 + (frame ? 1 : 0)]], R(cols[i % 3]), () => 0.5); }
  return outlined(L);
}
// potted laurel by the door
function laurel() { const L = tile(); rect(L, 5, 10, 10, 15, "o"); rect(L, 5, 10, 10, 11, "p"); L.ellipse(7.5, 6, 5, 5, R("g" + "h" + "h"), { bias: 0 }); L.ellipse(5, 4, 2, 2, R("hhh"), { bias: 0 }); L.set(9, 3, "3"); return outlined(L); }

const THEATRE = {
  id: "theatre", name: "Behavioural Theatre tiles",
  fps: { footlights: 4, marquee: 4, window: 2, spotlight: 2, "lamp-top": 3, bunting: 2 },
  tiles: {
    plaza: [plaza(1)], "plaza-2": [plaza(2)], "stage-floor": [stageFloor(1)], "stage-mark": [stageFloor(2)], carpet: [carpet(1)], "carpet-2": [carpet(2)], footlights: [0, 1, 2, 3].map(footlights),
    "theatre-wall": [wall()], "roof-slate": [roofTile()], "roof-eave": [roofTile(true)], window: [window_(0), window_(1)], door: [door()], marquee: [0, 1, 2].map(marquee),
    "curtain-left": [curtain(0)], "curtain-mid": [curtain(1)], "curtain-right": [curtain(2)], pelmet: [pelmet()],
    "column-top": [columnTop()], "column-base": [columnBase()],
    spotlight: [spotlight(0), spotlight(1)], seats: [seats()], poster: [poster()], "booth-top": [boothTop()], "booth-front": [boothFront()], trunk: [trunk()], sign: [sign()],
    "lamp-top": [lampTop(0), lampTop(1)], "lamp-base": [lampBase()], bunting: [bunting(0), bunting(1)], laurel: [laurel()],
  },
};

const body = Object.entries(THEATRE.tiles).map(([k, frames]) => `    ${JSON.stringify(k)}: [\n${frames.map((f) => `      [\n${f.rows().map((r) => `        ${JSON.stringify(r)},`).join("\n")}\n      ],`).join("\n")}\n    ],`).join("\n");
writeFileSync("game/sprites/tiles/theatre.ts", `// Generated by scripts/art/theatre-tiles.mjs, then committed. Edit freely.
import type { TileSetDef } from "./tileset";

export const THEATRE_TILES: TileSetDef = {
  id: ${JSON.stringify(THEATRE.id)},
  name: ${JSON.stringify(THEATRE.name)},
  size: ${S},
  palette: ${JSON.stringify(PALETTE, null, 2).replace(/\n/g, "\n  ")},
  fps: ${JSON.stringify(THEATRE.fps)},
  tiles: {
${body}
  },
};
`);
previewSheet(THEATRE.id, PALETTE, THEATRE.tiles, 4);
