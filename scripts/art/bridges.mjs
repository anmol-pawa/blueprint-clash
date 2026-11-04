// The Structural Bridges Patternlings (part 1): AXOLINK (Adapter), BRIDGEBACK (Bridge),
// FRACTREE (Composite), SHELLCRAB (Decorator). 64x64, idle 4 / attack 3 / hurt 2 / faint 4 / evolve 4.
// Run: node scripts/art/bridges.mjs   (ART_PREVIEW=<dir> writes contact sheets)
import { Layer, dissolve, emit, scaleLayer, sparkle, whiten } from "./paint.mjs";

const W = 64;
const H = 64;

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
function box(L, x0, y0, x1, y1, ramp, bias = 0) {
  L.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], ramp, (x, y) => 0.62 + bias - (x - x0) / (x1 - x0) * 0.3 - (y - y0) / (y1 - y0) * 0.22);
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

// ------------------------------------------------------------------ AXOLINK
const AXO_PAL = {
  k: "#3a1030", d: "#a8386a", c: "#d9638f", b: "#f08fb0", a: "#ffc8da", // pink axolotl
  p: "#f6b0b8", q: "#ffe6e8", // belly
  g: "#3d3a46", h: "#8d8a9a", i: "#d4d4e2", // metal plugs
  u: "#d9a21b", v: "#ffd75a", // contacts
  r: "#2f9fe0", s: "#8fd6ff", // second connector blue
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", e: "#7be0ff",
};
const PINK = ["d", "c", "b", "a"];
const METAL = ["g", "h", "i"];
function axolink({ dy = 0, lean = 0, blink = false, mouth = "smile", gill = 0, tail = 0, spark = 0, squash = 0 }) {
  const out = new Layer(W, H);
  // tail ends in a plug of the *other* shape (the adaptee side)
  const t = new Layer(W, H);
  t.ellipse(46, 52 + dy, 11, 5, PINK, { bias: -0.2 });
  t.ellipse(54, 49 + dy - tail, 6, 3.5, PINK, { bias: -0.15 });
  box(t, 56, 44 + dy - tail, 62, 51 + dy - tail, METAL);
  t.set(58, 42 + dy - tail, "v");
  t.set(60, 42 + dy - tail, "v");
  t.set(58, 43 + dy - tail, "v");
  t.set(60, 43 + dy - tail, "v");
  out.draw(ink(t), lean, 0);
  const b = new Layer(W, H);
  const by = 46 + dy + squash;
  b.ellipse(22, 58, 5, 2.6, PINK, { bias: -0.2 });
  b.ellipse(38, 58, 5, 2.6, PINK, { bias: -0.3 });
  b.ellipse(30, by, 16, 12 - squash * 0.5, PINK, { bias: -0.05 });
  b.ellipse(30, by + 2, 10, 8, ["p", "q", "w"], { bias: 0.05 });
  // frilly gills (three each side)
  for (let i = 0; i < 3; i++) {
    b.ellipse(14 - i * 1.5, 22 + dy + i * 4 - gill, 5, 1.8, ["m", "n", "a"], { bias: 0.1 });
    b.ellipse(46 + i * 1.5, 22 + dy + i * 4 + gill, 5, 1.8, ["m", "n", "a"], { bias: 0.0 });
  }
  b.ellipse(30, 28 + dy, 16, 13, PINK);
  ink(b);
  out.draw(b, lean, 0);
  // front connector on the nose (the Target interface plug)
  const p = new Layer(W, H);
  box(p, 20, 38 + dy, 40, 43 + dy, ["r", "s", "i"]);
  p.set(24, 40 + dy, "w");
  p.set(36, 40 + dy, "w");
  out.draw(ink(p), lean, 0);
  const f = new Layer(W, H);
  const ey = 26 + dy;
  eye(f, 23, ey, -1, blink);
  eye(f, 37, ey, 1, blink);
  f.ellipse(30, 32 + dy, 1.6, 1, ["k", "d"]);
  if (mouth === "open") f.ellipse(30, 36 + dy, 3.2, 1.8, ["k", "m", "n"]);
  f.outline("k");
  out.draw(f, lean, 0);
  if (spark) {
    const sp = new Layer(W, H);
    sp.line(52 + lean, 38 + dy, 56 + lean, 34 + dy, "v");
    sp.line(57, 37 + dy, 61, 33 + dy, "z");
    sp.set(54, 36 + dy, "w");
    out.draw(sp);
  }
  return out;
}
const axoAnims = animate(axolink, {
  idle: [{}, { dy: 1, gill: 1, tail: 1 }, { dy: 1, blink: true, gill: 2, tail: 2 }, { dy: 0, gill: 1, tail: 1 }],
  attack: [{ dy: 1, squash: 2, tail: -2, mouth: "open" }, { dy: -2, lean: 3, tail: 6, spark: 1, mouth: "open", gill: 2 }, { lean: 1, tail: 3, spark: 1, gill: 1 }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", gill: -2 }, { dy: 1, lean: -1, blink: true, gill: -1 }],
});
emit("game/sprites/creatures/axolink.ts", { id: "axolink", name: "AXOLINK", w: W, h: H, palette: AXO_PAL, fps: { idle: 4, attack: 8, hurt: 8, faint: 6, evolve: 6 }, anims: axoAnims, script: "bridges", comment: "Adapter: a pink axolotl with a blue plug on its nose and a gold-pin plug on its tail, converting one interface into the other." });

// --------------------------------------------------------------- BRIDGEBACK
const BRG_PAL = {
  k: "#1b2326", d: "#3b5c52", c: "#5f8a78", b: "#8fb8a0", a: "#cfe8d4", // tortoise green
  s: "#7a6a58", t: "#a8967c", u: "#d6c7a6", v: "#f0e6cc", // stone arch
  p: "#c9a26a", q: "#efd09a", // skin
  o: "#b04a3a", n: "#e07a5a", // flag
  g: "#3d5a8c", h: "#7aa6e0", // water
  w: "#ffffff", z: "#ffffff", e: "#7be0ff", m: "#c4506a",
};
const SHELL = ["d", "c", "b", "a"];
const STONE = ["s", "t", "u", "v"];
function bridgeback({ dy = 0, lean = 0, blink = false, mouth = "smile", flag = 0, squash = 0, neck = 0 }) {
  const out = new Layer(W, H);
  const b = new Layer(W, H);
  const by = 44 + dy + squash;
  // legs
  b.ellipse(18, 58, 6, 3, ["p", "q", "v"], { bias: -0.2 });
  b.ellipse(46, 58, 6, 3, ["p", "q", "v"], { bias: -0.3 });
  // domed shell
  b.ellipse(32, by + 2, 22, 14 - squash * 0.5, SHELL, { bias: -0.05 });
  // neck + head (right side, the Implementor end)
  b.ellipse(52 + neck, by - 4 - neck * 0.4, 5, 7, ["p", "q", "v"], { bias: 0 });
  b.ellipse(55 + neck, by - 12 - neck * 0.4, 6.5, 5.5, ["p", "q", "v"], { bias: 0.05 });
  b.ellipse(8, by + 3, 4, 3, ["p", "q"], { bias: -0.3 }); // tail stub
  ink(b);
  out.draw(b, lean, 0);
  // two stone arch spans bridging the shell (abstraction side and implementor side)
  const a = new Layer(W, H);
  box(a, 10, by - 10, 54, by - 5, STONE, 0.05); // deck
  for (const x of [14, 32, 50]) box(a, x - 2, by - 5, x + 2, by + 6, STONE, -0.1); // piers
  a.ellipse(23, by + 3, 6, 5, ["s"]);
  a.ellipse(41, by + 3, 6, 5, ["s"]);
  for (const x of [11, 19, 27, 35, 43, 51]) a.set(x, by - 11, "u"); // rail posts
  a.line(10, by - 12, 54, by - 12, "t");
  out.draw(ink(a), lean, 0);
  // water gaps under arches
  const w = new Layer(W, H);
  w.ellipse(23, by + 5, 4, 2.5, ["g", "h"]);
  w.ellipse(41, by + 5, 4, 2.5, ["g", "h"]);
  out.draw(w, lean, 0);
  // pennant on the deck (swaps with the runtime implementor)
  const fl = new Layer(W, H);
  fl.line(32, by - 24, 32, by - 12, "k");
  fl.poly([[33, by - 24], [41 + flag, by - 21], [33, by - 18]], ["o", "n"], (x) => 0.4 + (x - 33) / 20);
  out.draw(fl, lean, 0);
  // face
  const f = new Layer(W, H);
  const hx = 55 + neck;
  const ey = by - 13 - neck * 0.4;
  eye(f, hx + 1, ey, 1, blink, 2.8);
  if (mouth === "open") f.ellipse(hx + 5, ey + 4, 2.6, 1.8, ["k", "m", "n"]);
  else f.line(hx + 1, ey + 5, hx + 6, ey + 5, "k");
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const brgAnims = animate(bridgeback, {
  idle: [{}, { dy: 1, flag: 1, neck: 1 }, { dy: 1, blink: true, flag: 3, neck: 1 }, { dy: 0, flag: 1 }],
  attack: [{ dy: 1, squash: 2, neck: -2, mouth: "open" }, { dy: -2, lean: 2, neck: 3, flag: 3, mouth: "open" }, { lean: 1, neck: 2, flag: 2, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", neck: -3 }, { dy: 1, lean: -1, blink: true, neck: -1 }],
});
emit("game/sprites/creatures/bridgeback.ts", { id: "bridgeback", name: "BRIDGEBACK", w: W, h: H, palette: BRG_PAL, fps: { idle: 4, attack: 8, hurt: 8, faint: 6, evolve: 6 }, anims: brgAnims, script: "bridges", comment: "Bridge: a green tortoise carrying a stone arch bridge on its shell; the pennant on the span can be swapped without changing the tortoise." });

// ------------------------------------------------------------------ FRACTREE
const TREE_PAL = {
  k: "#16210f", d: "#2f5a22", c: "#4d8a35", b: "#7cbb4f", a: "#c0ef8a", // leaves
  s: "#4a2e1a", t: "#6e4628", u: "#96653a", v: "#c08d58", // bark
  m: "#c4506a", n: "#ff9fb0", f: "#ffd75a", w: "#ffffff", z: "#ffffff", e: "#7be0ff", h: "#d8d8e0",
};
const LEAF = ["d", "c", "b", "a"];
const BARK = ["s", "t", "u", "v"];
function mini(L, cx, cy, r, blink) {
  // a small copy of the whole creature: same body, same face (a leaf node is a Component too)
  L.ellipse(cx, cy, r, r * 0.9, LEAF, { bias: 0.05 });
  if (!blink) {
    L.set(cx - r * 0.35, cy, "k");
    L.set(cx + r * 0.35, cy, "k");
  }
  L.set(cx, cy + r * 0.4, "k");
}
function fractree({ dy = 0, lean = 0, blink = false, mouth = "smile", sway = 0, grow = 0, squash = 0 }) {
  const out = new Layer(W, H);
  const b = new Layer(W, H);
  const by = 44 + dy + squash;
  // roots
  b.line(24, 58, 18, 62, "t");
  b.line(40, 58, 46, 62, "t");
  b.ellipse(32, 58, 7, 3, BARK, { bias: -0.2 });
  // trunk
  box(b, 25, by - 4, 39, 58, BARK);
  // branches: two sub-trees, each a smaller tree with its own children
  const bx = [[17 + sway, 21], [47 - sway, 21]];
  for (const [x, y] of bx) {
    b.line(32, by - 2, x, y + dy + 6, "u");
    b.line(32, by - 3, x, y + dy + 5, "t");
  }
  ink(b);
  out.draw(b, lean, 0);
  const lv = new Layer(W, H);
  // main crown (the composite itself)
  lv.ellipse(32, 26 + dy, 15, 13, LEAF, { bias: 0 });
  // child composites with their own leaves (recursion made visible)
  for (const [x, y] of bx) {
    lv.ellipse(x, y + dy, 8 + grow, 7 + grow, LEAF, { bias: -0.08 });
    mini(lv, x - 4, y + dy - 6, 3.2 + grow * 0.5, blink);
    mini(lv, x + 5, y + dy - 5, 2.6 + grow * 0.5, blink);
  }
  lv.ellipse(32, 8 + dy, 5, 4, LEAF, { bias: 0.1 });
  mini(lv, 32, 7 + dy, 2.2, blink);
  ink(lv);
  out.draw(lv, lean, 0);
  // face on the trunk/crown
  const f = new Layer(W, H);
  const ey = 27 + dy;
  eye(f, 26, ey, -1, blink, 3.6);
  eye(f, 38, ey, 1, blink, 3.6);
  if (mouth === "open") f.ellipse(32, 35 + dy, 3.2, 2.2, ["k", "m", "n"]);
  else {
    f.line(29, 34 + dy, 30, 35 + dy, "k");
    f.line(30, 35 + dy, 34, 35 + dy, "k");
    f.line(34, 35 + dy, 35, 34 + dy, "k");
  }
  f.outline("k");
  out.draw(f, lean, 0);
  // blossoms
  out.set(10 + sway, 14 + dy, "f");
  out.set(54 - sway, 14 + dy, "f");
  out.set(22, 4 + dy, "n");
  return out;
}
const treeAnims = animate(fractree, {
  idle: [{}, { dy: 1, sway: 1 }, { dy: 1, blink: true, sway: 2 }, { dy: 0, sway: 1 }],
  attack: [{ dy: 1, squash: 2, sway: -2, mouth: "open" }, { dy: -2, lean: 2, sway: 4, grow: 2, mouth: "open" }, { lean: 1, sway: 2, grow: 1, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", sway: -2 }, { dy: 1, lean: -1, blink: true, sway: -1 }],
});
emit("game/sprites/creatures/fractree.ts", { id: "fractree", name: "FRACTREE", w: W, h: H, palette: TREE_PAL, fps: { idle: 4, attack: 8, hurt: 8, faint: 6, evolve: 6 }, anims: treeAnims, script: "bridges", comment: "Composite: a tree whose branches end in smaller copies of itself; a leaf and a whole tree answer the same calls." });

// ----------------------------------------------------------------- SHELLCRAB
const CRAB_PAL = {
  k: "#2a0f12", d: "#8a2a1f", c: "#c4472c", b: "#ee7a4a", a: "#ffb88a", // crab
  p: "#2a6f9a", q: "#4aa8d6", r: "#9fdcf5", // blue shell
  s: "#6a3a8a", t: "#9a64c0", u: "#cfa6ec", // purple shell
  y: "#d9a21b", x: "#ffd75a", // gold shell
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffffff", e: "#7be0ff", h: "#d8d8e0", g: "#3d3a46",
};
const CRAB = ["d", "c", "b", "a"];
function shellcrab({ dy = 0, lean = 0, blink = false, mouth = "smile", claw = 0, shells = 3, squash = 0, stalk = 0 }) {
  const out = new Layer(W, H);
  const b = new Layer(W, H);
  const by = 48 + dy + squash;
  // legs
  for (let i = 0; i < 3; i++) {
    b.line(16 + i * 2, by + 6, 6 - i * 2, 52 + i * 4, "d");
    b.line(48 - i * 2, by + 6, 58 + i * 2, 52 + i * 4, "d");
  }
  b.ellipse(32, by + 2, 18, 10 - squash * 0.5, CRAB, { bias: 0 });
  // claws
  b.ellipse(10, by - 8 - claw, 6, 5, CRAB, { bias: -0.05 });
  b.ellipse(54, by - 8 - claw, 6, 5, CRAB, { bias: -0.2 });
  b.line(10, by - 6 - claw, 8, by + 2, "c");
  b.line(54, by - 6 - claw, 56, by + 2, "c");
  // eye stalks
  b.line(26, by - 6, 26, by - 12 - stalk, "c");
  b.line(38, by - 6, 38, by - 12 - stalk, "c");
  ink(b);
  out.draw(b, lean, 0);
  // stacked decorator shells: each wraps the previous one, widening, and costs a layer
  const rings = [["p", "q", "r"], ["s", "t", "u"], ["y", "x", "w"]];
  const sh = new Layer(W, H);
  for (let i = shells - 1; i >= 0; i--) {
    const rx = 12 + i * 4;
    const ry = 7 + i * 3;
    sh.ellipse(32, by - 5 - i * 2, rx, ry, rings[i], { bias: -0.1 });
    sh.line(32 - rx * 0.55, by - 5 - i * 2 - ry * 0.35, 32 + rx * 0.55, by - 5 - i * 2 - ry * 0.35, ["p", "s", "y"][i]);
  }
  ink(sh);
  out.draw(sh, lean, 0);
  // face peeks from the innermost shell opening
  const f = new Layer(W, H);
  const ey = by - 4;
  for (const [ex, sg] of [[26, -1], [38, 1]]) {
    if (blink) f.line(ex - 3, ey + 1, ex + 3, ey + 1, "k");
    else {
      f.ellipse(ex, ey - stalk, 3.6, 4, ["h", "w", "w"], { bias: 0.3 });
      f.ellipse(ex + sg * 0.5, ey + 0.6 - stalk, 2, 2.6, ["k", "d"], { bias: -0.4 });
      f.set(ex + sg * 0.5 - 1, ey - 1 - stalk, "w");
    }
  }
  if (mouth === "open") f.ellipse(32, by + 3, 3.4, 2.4, ["k", "m", "n"]);
  else {
    f.line(28, by + 2, 29, by + 3, "k");
    f.line(29, by + 3, 35, by + 3, "k");
    f.line(35, by + 3, 36, by + 2, "k");
  }
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const crabAnims = animate(shellcrab, {
  idle: [{ shells: 2 }, { dy: 1, claw: 1, shells: 2, stalk: 1 }, { dy: 1, blink: true, claw: 2, shells: 3 }, { dy: 0, claw: 1, shells: 3 }],
  attack: [{ dy: 1, squash: 2, claw: -2, shells: 3, mouth: "open" }, { dy: -2, lean: -3, claw: 6, shells: 3, mouth: "open" }, { lean: -1, claw: 3, shells: 3, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", claw: -2, shells: 1 }, { dy: 1, lean: -1, blink: true, shells: 2 }],
});
emit("game/sprites/creatures/shellcrab.ts", { id: "shellcrab", name: "SHELLCRAB", w: W, h: H, palette: CRAB_PAL, fps: { idle: 4, attack: 8, hurt: 8, faint: 6, evolve: 6 }, anims: crabAnims, script: "bridges", comment: "Decorator: a crab wearing a stack of shells (blue, purple, gold); each shell wraps the last and adds a layer without changing the crab." });
