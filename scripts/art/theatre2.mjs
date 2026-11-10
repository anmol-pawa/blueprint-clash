// The Behavioural Theatre Patternlings (part 2): SHAPESHIFT (State), TEMPLAR (Template Method),
// INCHWORM (Iterator), ANTCHAIN (Chain of Responsibility). 64x64, idle 4 / attack 3 / hurt 2 / faint 4 / evolve 4.
// Run: node scripts/art/theatre2.mjs   (ART_PREVIEW=<dir> writes contact sheets)
import { Layer, dissolve, emit, scaleLayer, sparkle, whiten } from "./paint.mjs";

const W = 64;
const H = 64;
const FPS = { idle: 4, attack: 8, hurt: 8, faint: 6, evolve: 6 };

function animate(pose, { idle, attack, hurt }) {
  const base = pose({});
  const f0 = pose(hurt[0]);
  return {
    idle: idle.map(pose),
    attack: attack.map(pose),
    hurt: hurt.map(pose),
    faint: [f0, dissolve(f0, 0.15, 3), dissolve(f0, 0.5, 6), dissolve(f0, 0.85, 9)],
    evolve: [whiten(base, 0.4, "w"), scaleLayer(whiten(base, 1, "w"), 1.12, 0.92, 32, 58), scaleLayer(whiten(base, 1, "w"), 0.94, 1.1, 32, 58), sparkle(whiten(base, 1, "w"), 50, 14, 3, "z", "w")],
  };
}
const ink = (L) => L.outline("k");
const eye = (f, ex, ey, s, blink, big = 4.2) => {
  if (blink) f.line(ex - 3, ey + 1, ex + 3, ey + 1, "k");
  else {
    f.ellipse(ex, ey, big, big + 0.6, ["h", "w", "w"], { bias: 0.3 });
    f.ellipse(ex + s * 0.5, ey + 0.6, 2.2, 2.8, ["k", "d"], { bias: -0.4 });
    f.set(ex + s * 0.5 - 1, ey - 1, "w");
  }
};

// --------------------------------------------------------------- SHAPESHIFT
// A gel blob whose whole body re-tints per mode (teal idle, amber active, violet locked) with a mode dial on its chest.
const SS_PAL = {
  k: "#1a1030", d: "#1f7a7a", c: "#38b0a8", b: "#7ee0cc", a: "#d0fff0", // teal mode
  r: "#9a5a14", s: "#e0902a", t: "#ffc860", u: "#fff0b0", // amber mode
  v: "#4a2f8a", x: "#7a58c8", y: "#a898f0", e: "#ddd4ff", // violet mode
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", h: "#d8d8e0", g: "#3d3a46",
};
const MODES = [["d", "c", "b", "a"], ["r", "s", "t", "u"], ["v", "x", "y", "e"]];
function shapeshift({ dy = 0, lean = 0, blink = false, mouth = "smile", squash = 0, mode = 0, drip = 0 }) {
  const out = new Layer(W, H);
  const ramp = MODES[mode % 3];
  const b = new Layer(W, H);
  const by = 40 + dy + squash;
  b.ellipse(32, by + 6, 22 + squash, 15 - squash, ramp);
  b.ellipse(20, by - 8, 7, 9, ramp, { bias: 0.1 });
  b.ellipse(44, by - 8, 7, 9, ramp, { bias: 0.1 });
  b.ellipse(32, by - 12, 14, 10, ramp, { bias: 0.15 });
  b.ellipse(14 - drip, 56, 3, 2.4 + drip * 0.5, ramp, { bias: -0.2 });
  ink(b);
  out.draw(b, lean, 0);
  // mode dial: a ring with three ticks, the active tick lit
  const dl = new Layer(W, H);
  dl.ellipse(32, by + 10, 6, 6, ["g", "h", "w"], { bias: 0.1 });
  for (let i = 0; i < 3; i++) {
    const a = -2.4 + i * 0.95;
    dl.set(32 + Math.cos(a) * 4, by + 10 + Math.sin(a) * 4, i === mode % 3 ? "m" : "k");
  }
  out.draw(ink(dl), lean, 0);
  const f = new Layer(W, H);
  const ey = by - 10;
  eye(f, 25, ey, -1, blink, 4);
  eye(f, 39, ey, 1, blink, 4);
  if (mouth === "open") f.ellipse(32, ey + 8, 3.2, 2, ["k", "m", "n"]);
  else {
    f.line(29, ey + 7, 30, ey + 8, "k");
    f.line(30, ey + 8, 34, ey + 8, "k");
    f.line(34, ey + 8, 35, ey + 7, "k");
  }
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const ssAnims = animate(shapeshift, {
  idle: [{ mode: 0 }, { dy: 1, mode: 0, drip: 1 }, { dy: 1, blink: true, mode: 1 }, { dy: 0, mode: 1, drip: 1 }],
  attack: [{ dy: 1, squash: 3, mode: 1, mouth: "open" }, { dy: -2, lean: 3, squash: -1, mode: 2, mouth: "open" }, { lean: 1, mode: 2, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", mode: 2 }, { dy: 1, lean: -1, blink: true, mode: 2 }],
});
emit("game/sprites/creatures/shapeshift.ts", { id: "shapeshift", name: "SHAPESHIFT", w: W, h: H, palette: SS_PAL, fps: FPS, anims: ssAnims, script: "theatre2", comment: "State: a gel blob that re-tints and re-behaves per mode; the dial shows which state object is current." });

// ------------------------------------------------------------------ TEMPLAR
// A stone-mason beetle holding a stencil frame: three fixed rungs with one slot (the hook) that subclasses fill.
const TP_PAL = {
  k: "#2a1810", d: "#6a3a1a", c: "#a8642a", b: "#d9924a", a: "#ffd9a0", // bronze shell
  s: "#5a6a7a", t: "#8a9aa8", u: "#c4d0d8", // stencil frame
  y: "#d9a21b", x: "#ffd75a", // lit slot
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", e: "#7be0ff", h: "#d8d8e0", g: "#3d3a46",
};
const SHELL = ["d", "c", "b", "a"];
function templar({ dy = 0, lean = 0, blink = false, mouth = "smile", squash = 0, step = 0, arm = 0 }) {
  const out = new Layer(W, H);
  const b = new Layer(W, H);
  const by = 40 + dy + squash;
  for (const x of [18, 26, 38, 46]) b.ellipse(x, 58, 3.2, 2.4, SHELL, { bias: -0.3 });
  b.ellipse(32, by, 17, 15 - squash * 0.5, SHELL);
  b.line(32, by - 14, 32, by + 14, "k");
  b.ellipse(32, 22 + dy + squash, 10, 8, SHELL, { bias: 0.1 });
  b.line(24, 16 + dy, 20, 8 + dy, "k");
  b.line(40, 16 + dy, 44, 8 + dy, "k");
  ink(b);
  out.draw(b, lean, 0);
  // stencil frame held up front: 3 rungs, the middle one is the open hook (lit when it is its turn)
  const fr = new Layer(W, H);
  const fx = 46 + arm;
  fr.poly([[fx - 8, 32 + dy], [fx + 8, 32 + dy], [fx + 8, 58 + dy], [fx - 8, 58 + dy]], ["s", "t"], () => 0.4);
  for (let i = 0; i < 3; i++) {
    const hook = i === 1;
    const on = step % 3 === i;
    const col = hook ? (on ? ["y", "x", "z"] : ["g", "g", "h"]) : on ? ["t", "u", "w"] : ["s", "t", "u"];
    fr.ellipse(fx, 38 + dy + i * 8, 5.5, 2.8, col, { bias: 0.1 });
  }
  out.draw(ink(fr), lean, 0);
  const f = new Layer(W, H);
  const ey = 21 + dy + squash;
  eye(f, 27, ey, -1, blink, 3);
  eye(f, 37, ey, 1, blink, 3);
  if (mouth === "open") f.ellipse(32, ey + 6, 2.4, 1.6, ["k", "m", "n"]);
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const tpAnims = animate(templar, {
  idle: [{ step: 0 }, { dy: 1, step: 1 }, { dy: 1, blink: true, step: 1, arm: 1 }, { dy: 0, step: 2 }],
  attack: [{ dy: 1, squash: 2, step: 0, arm: -3, mouth: "open" }, { dy: -2, lean: 3, step: 1, arm: 5, mouth: "open" }, { lean: 1, step: 2, arm: 2, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", arm: -2 }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/templar.ts", { id: "templar", name: "TEMPLAR", w: W, h: H, palette: TP_PAL, fps: FPS, anims: tpAnims, script: "theatre2", comment: "Template Method: a mason beetle with a stencil of fixed steps and one open hook that variants fill in." });

// ----------------------------------------------------------------- INCHWORM
// A segmented lime worm arched over; a bright marker ring walks segment by segment (a cursor over a sequence).
const IW_PAL = {
  k: "#12281a", d: "#2e7a3c", c: "#5ab84e", b: "#96e06a", a: "#e0ffb0",
  r: "#a83a3a", s: "#e0605a", t: "#ffa090", // cursor ring
  y: "#d9a21b", x: "#ffd75a",
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", e: "#7be0ff", h: "#d8d8e0", g: "#3d3a46",
};
const GRN = ["d", "c", "b", "a"];
function inchworm({ dy = 0, lean = 0, blink = false, mouth = "smile", squash = 0, cur = 0, arch = 0 }) {
  const out = new Layer(W, H);
  const b = new Layer(W, H);
  const pts = [];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = 8 + t * 38;
    const y = 54 + dy - Math.sin(t * Math.PI) * (22 + arch) + squash;
    pts.push([x, y]);
  }
  pts.forEach(([x, y], i) => b.ellipse(x, y, 6.5 - (i === 0 ? 1.5 : 0), 6.5 - (i === 0 ? 1.5 : 0), GRN, { bias: -0.05 * i }));
  b.ellipse(52, 52 + dy + squash, 8, 7.5, GRN, { bias: 0.1 });
  ink(b);
  out.draw(b, lean, 0);
  // cursor ring on the current segment
  const c = new Layer(W, H);
  const [cx, cy] = pts[cur % n];
  for (let a = 0; a < 6.3; a += 0.25) c.set(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, "s");
  c.set(cx, cy - 8, "t");
  out.draw(c, lean, 0);
  const f = new Layer(W, H);
  const ey = 49 + dy + squash;
  eye(f, 51, ey, 1, blink, 3.8);
  if (mouth === "open") f.ellipse(56, ey + 6, 2.6, 1.8, ["k", "m", "n"]);
  else f.line(53, ey + 6, 58, ey + 6, "k");
  f.line(48, ey - 7, 46, ey - 12, "k");
  f.line(54, ey - 7, 56, ey - 12, "k");
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const iwAnims = animate(inchworm, {
  idle: [{ cur: 0 }, { dy: 1, cur: 1 }, { dy: 1, blink: true, cur: 2, arch: 1 }, { dy: 0, cur: 3 }],
  attack: [{ dy: 2, squash: 1, arch: -6, cur: 1, mouth: "open" }, { dy: -1, lean: 3, arch: 5, cur: 4, mouth: "open" }, { lean: 1, arch: 2, cur: 5, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", arch: -3 }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/inchworm.ts", { id: "inchworm", name: "INCHWORM", w: W, h: H, palette: IW_PAL, fps: FPS, anims: iwAnims, script: "theatre2", comment: "Iterator: a segmented worm with a cursor ring that visits one segment at a time without anyone seeing how it is built." });

// ----------------------------------------------------------------- ANTCHAIN
// A rust ant standing at the head of a chain of linked rings, each ring a handler; a parcel rides down the links.
const AC_PAL = {
  k: "#2a1214", d: "#7a2a22", c: "#b04a38", b: "#e07a58", a: "#ffc0a0", // rust body
  s: "#5a6a7a", t: "#8a9aa8", u: "#c4d0d8", // chain links
  y: "#d9a21b", x: "#ffd75a", o: "#a83a3a", f: "#e0605a", // parcel
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", e: "#7be0ff", h: "#d8d8e0", g: "#3d3a46",
};
const RUST = ["d", "c", "b", "a"];
function antchain({ dy = 0, lean = 0, blink = false, mouth = "smile", squash = 0, pass = 0, sway = 0 }) {
  const out = new Layer(W, H);
  // chain of three links along the ground, parcel sits on link `pass`
  const ch = new Layer(W, H);
  for (let i = 0; i < 3; i++) {
    const x = 8 + i * 13;
    ch.ellipse(x, 58 + (i % 2) - 1, 6.5, 3.4, ["s", "t", "u"], { bias: 0.1 });
    ch.ellipse(x, 58 + (i % 2) - 1, 3.4, 1.4, ["k"]);
  }
  out.draw(ink(ch), 0, 0);
  const pc = new Layer(W, H);
  const px = 8 + (pass % 3) * 13;
  pc.poly([[px - 4, 46], [px + 4, 46], [px + 4, 54], [px - 4, 54]], ["y", "x"], () => 0.6);
  pc.line(px - 4, 50, px + 4, 50, "o");
  pc.line(px, 46, px, 54, "o");
  out.draw(ink(pc), 0, 0);
  const b = new Layer(W, H);
  const by = 38 + dy + squash;
  b.ellipse(48 + sway, by + 6, 9, 8, RUST, { bias: -0.1 });
  b.ellipse(38, by + 2, 6, 5.5, RUST);
  b.ellipse(30, 24 + dy + squash, 11, 9.5, RUST, { bias: 0.1 });
  for (const x of [33, 39, 45]) b.line(x, by + 6, x - 4 + (x === 39 ? 0 : sway), 58, "d");
  b.line(24, 17 + dy, 18, 8 + dy, "k");
  b.line(34, 16 + dy, 38, 7 + dy, "k");
  ink(b);
  out.draw(b, lean, 0);
  const f = new Layer(W, H);
  const ey = 23 + dy + squash;
  eye(f, 27, ey, -1, blink, 3.6);
  if (mouth === "open") f.ellipse(22, ey + 8, 3, 2, ["k", "m", "n"]);
  else f.line(20, ey + 8, 26, ey + 8, "k");
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const acAnims = animate(antchain, {
  idle: [{ pass: 0 }, { dy: 1, pass: 1, sway: 1 }, { dy: 1, blink: true, pass: 2 }, { dy: 0, pass: 1, sway: 1 }],
  attack: [{ dy: 1, squash: 2, pass: 0, mouth: "open" }, { dy: -2, lean: 3, pass: 1, mouth: "open", sway: 2 }, { lean: 1, pass: 2, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", sway: -1 }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/antchain.ts", { id: "antchain", name: "ANTCHAIN", w: W, h: H, palette: AC_PAL, fps: FPS, anims: acAnims, script: "theatre2", comment: "Chain of Responsibility: an ant at the head of linked rings; the parcel moves link to link until one handles it." });
