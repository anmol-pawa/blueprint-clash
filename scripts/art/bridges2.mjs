// The Structural Bridges Patternlings (part 2): FACADEON (Facade), FLYTILE (Flyweight),
// PROXIFOX (Proxy). 64x64, idle 4 / attack 3 / hurt 2 / faint 4 / evolve 4.
// Run: node scripts/art/bridges2.mjs   (ART_PREVIEW=<dir> writes contact sheets)
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


// ------------------------------------------------------------------ FACADEON
const FAC_PAL = {
  k: "#1d1a2b", d: "#4a3f7a", c: "#6f62b0", b: "#9a8fd6", a: "#d4cdf5", // lilac body
  s: "#6b5a44", t: "#95805f", u: "#c2ab82", v: "#eadcb8", // building front
  y: "#d9a21b", x: "#ffd75a", // lit windows
  g: "#3d3a46", h: "#8d8a9a", i: "#d4d4e2", // hidden machinery behind
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", e: "#7be0ff",
};
const LIL = ["d", "c", "b", "a"];
const WALL = ["s", "t", "u", "v"];
function facadeon({ dy = 0, lean = 0, blink = false, mouth = "smile", door = 0, squash = 0, wave = 0 }) {
  const out = new Layer(W, H);
  // hidden subsystems behind the front (messy gears peeking out the sides)
  const g = new Layer(W, H);
  g.ellipse(8, 44 + dy, 5, 5, METAL_G, { bias: 0 });
  g.ellipse(56, 38 + dy, 6, 6, METAL_G, { bias: -0.1 });
  g.ellipse(54, 52 + dy, 4, 4, METAL_G, { bias: -0.2 });
  g.line(8, 44 + dy, 22, 40 + dy, "h");
  g.line(56, 38 + dy, 44, 40 + dy, "h");
  out.draw(ink(g), lean, 0);
  // creature body behind the front wall (little feet, arms)
  const b = new Layer(W, H);
  const by = 36 + dy + squash;
  b.ellipse(22, 59, 6, 3, LIL, { bias: -0.2 });
  b.ellipse(42, 59, 6, 3, LIL, { bias: -0.3 });
  b.ellipse(32, by + 6, 20, 17 - squash * 0.5, LIL, { bias: -0.05 });
  b.ellipse(12, by + 8, 4, 6, LIL, { bias: -0.1 });
  b.ellipse(52, by + 6 - wave, 4, 6, LIL, { bias: -0.25 });
  ink(b);
  out.draw(b, lean, 0);
  // the front: one tidy wall with a single door and a pediment (one simple entry point)
  const w = new Layer(W, H);
  box(w, 16, by + 4, 48, 56, WALL, 0.05);
  w.poly([[14, by + 4], [32, by - 6], [50, by + 4]], WALL, (x, y) => 0.7 - (y - (by - 6)) / 24);
  for (const x of [20, 40]) for (const y of [by + 10, by + 22]) {
    box(w, x, y, x + 5, y + 5, ["y", "x", "z"], 0.1);
  }
  box(w, 28, 44 + dy - door, 36, 56, ["g", "h", "i"], -0.1); // the one door
  w.set(34, 50, "x");
  out.draw(ink(w), lean, 0);
  // face on the pediment
  const f = new Layer(W, H);
  const ey = by + 1;
  eye(f, 27, ey, -1, blink, 3.2);
  eye(f, 37, ey, 1, blink, 3.2);
  if (mouth === "open") f.ellipse(32, ey + 7, 2.6, 1.8, ["k", "m", "n"]);
  else f.line(29, ey + 6, 35, ey + 6, "k");
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const METAL_G = ["g", "h", "i"];
const facAnims = animate(facadeon, {
  idle: [{}, { dy: 1, door: 1 }, { dy: 1, blink: true, door: 2, wave: 1 }, { dy: 0, door: 1 }],
  attack: [{ dy: 1, squash: 2, mouth: "open" }, { dy: -2, lean: 3, door: 4, wave: 5, mouth: "open" }, { lean: 1, door: 2, wave: 3, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open" }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/facadeon.ts", { id: "facadeon", name: "FACADEON", w: W, h: H, palette: FAC_PAL, fps: { idle: 4, attack: 8, hurt: 8, faint: 6, evolve: 6 }, anims: facAnims, script: "bridges2", comment: "Facade: a lilac creature behind one tidy storefront with a single door; the tangle of gears behind it stays reachable but hidden." });

// ------------------------------------------------------------------- FLYTILE
const TILE_PAL = {
  k: "#10222c", d: "#1f6a78", c: "#2f9aa6", b: "#6fd0c8", a: "#c6f5ea", // teal tile body
  y: "#d9a21b", x: "#ffd75a", // gold glyph
  r: "#c4506a", q: "#ff9fb0", // rosy cheek
  s: "#4a5560", t: "#8d9aa6", u: "#d4dde6", // shared stone base
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffffff", e: "#7be0ff", h: "#d8d8e0",
};
const TEAL = ["d", "c", "b", "a"];
const STN = ["s", "t", "u"];
function flytile({ dy = 0, lean = 0, blink = false, mouth = "smile", twin = 0, squash = 0, glow = 0 }) {
  const out = new Layer(W, H);
  // a row of small identical copies behind/below: many uses, one shared body
  const c = new Layer(W, H);
  for (const [x, y] of [[9, 52], [55, 52], [14, 40], [50, 40]]) {
    const yy = y + dy + (twin && x < 30 ? -twin : 0);
    box(c, x - 5, yy - 5, x + 5, yy + 5, TEAL, -0.15);
    c.set(x, yy, "x");
    c.set(x - 1, yy, "y");
  }
  out.draw(ink(c), lean, 0);
  const b = new Layer(W, H);
  const by = 34 + dy + squash;
  b.ellipse(32, 59, 22, 4, STN, { bias: 0 }); // shared pedestal (intrinsic state lives here)
  box(b, 14, by - 12, 50, by + 20 - squash, TEAL, 0.05);
  b.poly([[14, by - 12], [20, by - 18], [44, by - 18], [50, by - 12]], TEAL, () => 0.95);
  ink(b);
  out.draw(b, lean, 0);
  // the glyph carved on its belly: the immutable shared payload
  const gl = new Layer(W, H);
  gl.line(26, by + 6, 32, by + 15, "x");
  gl.line(32, by + 15, 38, by + 6, "x");
  gl.line(26, by + 6, 38, by + 6, "y");
  gl.set(32, by + 10 - glow, "w");
  out.draw(gl, lean, 0);
  const f = new Layer(W, H);
  const ey = by - 4;
  eye(f, 24, ey, -1, blink, 3.4);
  eye(f, 40, ey, 1, blink, 3.4);
  f.ellipse(19, ey + 6, 2, 1.2, ["r", "q"]);
  f.ellipse(45, ey + 6, 2, 1.2, ["r", "q"]);
  if (mouth === "open") f.ellipse(32, ey + 6, 3, 2, ["k", "m", "n"]);
  else {
    f.line(29, ey + 5, 30, ey + 6, "k");
    f.line(30, ey + 6, 34, ey + 6, "k");
    f.line(34, ey + 6, 35, ey + 5, "k");
  }
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const tileAnims = animate(flytile, {
  idle: [{}, { dy: 1, twin: 1 }, { dy: 1, blink: true, twin: 2, glow: 1 }, { dy: 0, twin: 1 }],
  attack: [{ dy: 1, squash: 3, mouth: "open" }, { dy: -3, lean: 3, twin: 4, glow: 3, mouth: "open" }, { lean: 1, twin: 2, glow: 2, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open" }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/flytile.ts", { id: "flytile", name: "FLYTILE", w: W, h: H, palette: TILE_PAL, fps: { idle: 4, attack: 8, hurt: 8, faint: 6, evolve: 6 }, anims: tileAnims, script: "bridges2", comment: "Flyweight: a teal tile with a carved gold glyph, surrounded by small identical copies that share the one glyph instead of owning their own." });

// ------------------------------------------------------------------ PROXIFOX
const FOX_PAL = {
  k: "#2b1608", d: "#a8501c", c: "#df7a2c", b: "#f4a24f", a: "#ffd9a0", // orange fox
  p: "#f6e8d0", q: "#ffffff", // cream chest/tail tip
  g: "#3d3a46", h: "#8d8a9a", i: "#d4d4e2", // butler mask/door
  y: "#d9a21b", x: "#ffd75a", // gold key
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffffff", e: "#7be0ff",
};
const FOX = ["d", "c", "b", "a"];
function proxifox({ dy = 0, lean = 0, blink = false, mouth = "smile", tail = 0, squash = 0, ear = 0, key = 0 }) {
  const out = new Layer(W, H);
  // the real subject: a ghostly second fox sits behind a gate, reached only through the proxy
  const gate = new Layer(W, H);
  box(gate, 44, 12 + dy, 62, 56, ["g", "h", "i"], -0.1);
  for (const x of [48, 53, 58]) gate.line(x, 14 + dy, x, 54, "k");
  gate.line(44, 30 + dy, 62, 30 + dy, "k");
  out.draw(ink(gate), lean, 0);
  const b = new Layer(W, H);
  const by = 42 + dy + squash;
  // tail
  b.ellipse(10, by + 2 - tail, 9, 5, FOX, { bias: -0.1 });
  b.ellipse(4, by - 2 - tail, 4, 3, ["p", "q"], { bias: 0.3 });
  // legs
  b.ellipse(22, 58, 5, 3, FOX, { bias: -0.2 });
  b.ellipse(38, 58, 5, 3, FOX, { bias: -0.3 });
  b.ellipse(30, by + 4, 15, 12 - squash * 0.5, FOX, { bias: -0.05 });
  b.ellipse(30, by + 8, 7, 7, ["p", "q"], { bias: 0.1 });
  // head with pointed ears
  b.ellipse(30, 22 + dy, 15, 12, FOX, { bias: 0.05 });
  b.poly([[17, 16 + dy], [19, 3 + dy - ear], [26, 12 + dy]], FOX, () => 0.55);
  b.poly([[43, 16 + dy], [41, 3 + dy - ear], [34, 12 + dy]], FOX, () => 0.4);
  b.ellipse(30, 28 + dy, 9, 6, ["p", "q"], { bias: 0.1 });
  ink(b);
  out.draw(b, lean, 0);
  // butler's mask and a key it holds: it controls access to the real thing
  const m = new Layer(W, H);
  box(m, 17, 19 + dy, 43, 23 + dy, ["g", "h"], 0);
  m.ellipse(48 - key, 38 + dy, 3, 3, ["y", "x"], { bias: 0.2 });
  m.line(48 - key, 41 + dy, 48 - key, 47 + dy, "y");
  m.set(49 - key, 46 + dy, "y");
  out.draw(ink(m), lean, 0);
  const f = new Layer(W, H);
  const ey = 21 + dy;
  eye(f, 24, ey, -1, blink, 3);
  eye(f, 36, ey, 1, blink, 3);
  f.ellipse(30, 27 + dy, 1.6, 1.1, ["k", "d"]);
  if (mouth === "open") f.ellipse(30, 31 + dy, 2.8, 1.8, ["k", "m", "n"]);
  else f.line(28, 30 + dy, 32, 30 + dy, "k");
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const foxAnims = animate(proxifox, {
  idle: [{}, { dy: 1, tail: 1, ear: 1 }, { dy: 1, blink: true, tail: 2 }, { dy: 0, tail: 1, key: 1 }],
  attack: [{ dy: 1, squash: 2, tail: -2, mouth: "open" }, { dy: -2, lean: 3, tail: 5, key: 4, mouth: "open" }, { lean: 1, tail: 3, key: 2, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", ear: -2 }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/proxifox.ts", { id: "proxifox", name: "PROXIFOX", w: W, h: H, palette: FOX_PAL, fps: { idle: 4, attack: 8, hurt: 8, faint: 6, evolve: 6 }, anims: foxAnims, script: "bridges2", comment: "Proxy: a butler-masked fox holding a key in front of a gate; it stands in for what is behind and decides when to open it." });
