// The Structural Bridges Patternlings (part 2): FACADEON (Facade), FLYTILE (Flyweight), PROXIFOX (Proxy).
// 64x64, idle 4 / attack 3 / hurt 2 / faint 4 / evolve 4.
// Run: node scripts/art/bridges2.mjs   (ART_PREVIEW=<dir> writes contact sheets)
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
const smile = (f, x, y, open) => {
  if (open) f.ellipse(x, y + 1, 3.2, 2.2, ["k", "m", "n"]);
  else {
    f.line(x - 3, y, x - 2, y + 1, "k");
    f.line(x - 2, y + 1, x + 2, y + 1, "k");
    f.line(x + 2, y + 1, x + 3, y, "k");
  }
};

// ----------------------------------------------------------------- FACADEON
// A tidy cream-stone house-front with a face; behind it a tangle of pipes and wires (the subsystems).
const FAC_PAL = {
  k: "#241a22", d: "#9a7a5e", c: "#c9a784", b: "#e6cfae", a: "#fbefd8", // cream stone
  r: "#8a3a2a", s: "#b5573b", t: "#d9825c", // roof tiles
  g: "#3d3a46", h: "#8d8a9a", i: "#d4d4e2", // pipes
  o: "#b04a3a", n: "#e07a5a", y: "#d9a21b", x: "#ffd75a", u: "#2f9fe0", // wires/lamp
  m: "#c4506a", w: "#ffffff", z: "#ffe9b0", e: "#7be0ff",
};
const STONE = ["d", "c", "b", "a"];
const ROOF = ["r", "s", "t"];
function facadeon({ dy = 0, lean = 0, blink = false, mouth = "smile", pipe = 0, squash = 0, door = 0 }) {
  const out = new Layer(W, H);
  // messy subsystems peeking out behind the facade
  const back = new Layer(W, H);
  box(back, 8, 20 + dy, 16, 56, ["g", "h", "i"], -0.1);
  box(back, 48, 14 + dy, 56, 56, ["g", "h", "i"], -0.1);
  back.line(14, 24 + dy, 6 + pipe, 10 + dy, "o");
  back.line(50, 20 + dy, 58 - pipe, 6 + dy, "u");
  back.line(52, 30 + dy, 62, 26 + dy + pipe, "y");
  back.line(12, 36 + dy, 2, 40 + dy - pipe, "n");
  back.ellipse(6 + pipe, 9 + dy, 2.5, 2.5, ["y", "x", "w"]);
  back.ellipse(58 - pipe, 5 + dy, 2.5, 2.5, ["u", "e", "w"]);
  out.draw(ink(back), lean, 0);
  // the facade: a single clean wall with a roof
  const f = new Layer(W, H);
  const top = 20 + dy + squash;
  box(f, 14, top, 50, 58, STONE);
  f.poly([[10, top + 2], [32, 6 + dy + squash], [54, top + 2]], ROOF, (x, y) => 0.7 - (y - (6 + dy)) / 24);
  for (const x of [20, 28, 36, 44]) f.line(x, 8 + dy + 8 + squash, x, top + 1, "r");
  // door (the single simple entry point), lamp above
  box(f, 26, 42, 38, 58, ["g", "h", "i"], -0.2);
  f.poly([[26, 42], [26 + door * 2, 42], [26 + door * 2, 58], [26, 58]], ["k"]);
  f.ellipse(32, 41, 6, 2, ["y", "x", "w"]);
  f.set(35, 50, "x");
  // windows
  box(f, 17, top + 3, 24, top + 10, ["u", "e", "w"], 0.1);
  box(f, 40, top + 3, 47, top + 10, ["u", "e", "w"], 0.1);
  out.draw(ink(f), lean, 0);
  // face above the door
  const fc = new Layer(W, H);
  const ey = top + 15;
  eye(fc, 24, ey, -1, blink, 3.4);
  eye(fc, 40, ey, 1, blink, 3.4);
  smile(fc, 32, ey + 6, mouth === "open");
  fc.outline("k");
  out.draw(fc, lean, 0);
  return out;
}
const facAnims = animate(facadeon, {
  idle: [{}, { dy: 1, pipe: 1 }, { dy: 1, blink: true, pipe: 2 }, { dy: 0, pipe: 1 }],
  attack: [{ dy: 1, squash: 2, pipe: -2, mouth: "open" }, { dy: -2, lean: 3, pipe: 4, door: 3, mouth: "open" }, { lean: 1, pipe: 2, door: 2, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", pipe: -2 }, { dy: 1, lean: -1, blink: true, pipe: -1 }],
});
emit("game/sprites/creatures/facadeon.ts", { id: "facadeon", name: "FACADEON", w: W, h: H, palette: FAC_PAL, fps: FPS, anims: facAnims, script: "bridges2", comment: "Facade: a tidy cream house-front with one door; the tangle of pipes and wires behind it stays hidden behind that single entry point." });

// ------------------------------------------------------------------ FLYTILE
// A teal mosaic tile with a face; a row of tiny identical tiles shares its colour (intrinsic state) and differs only by position.
const TILE_PAL = {
  k: "#12262e", d: "#1f6f78", c: "#33a5a0", b: "#6fd3c0", a: "#c4f5e4", // teal glaze
  s: "#6a5a7a", t: "#9a88b0", u: "#cfc0e6", // grout / stone
  y: "#d9a21b", x: "#ffd75a", o: "#e07a5a", // accents
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", e: "#7be0ff", h: "#d8d8e0", g: "#3d3a46",
};
const GLAZE = ["d", "c", "b", "a"];
function flytile({ dy = 0, lean = 0, blink = false, mouth = "smile", wob = 0, squash = 0, shine = 0 }) {
  const out = new Layer(W, H);
  // row of tiny shared copies behind (same glaze, only the x position differs)
  const row = new Layer(W, H);
  for (let i = 0; i < 6; i++) {
    const x = 4 + i * 10;
    const y = 50 + ((i + wob) % 2) + dy * 0.5;
    box(row, x, y, x + 7, y + 7, GLAZE, -0.1);
    row.set(x + 3, y + 3, "k");
  }
  out.draw(ink(row), lean, 0);
  // main tile
  const t = new Layer(W, H);
  const top = 10 + dy + squash;
  box(t, 12, top, 52, top + 36 - squash, GLAZE);
  // inset bevel and grout cross
  box(t, 17, top + 5, 47, top + 31 - squash, GLAZE, 0.12);
  t.line(32, top, 32, top + 5, "t");
  t.line(32, top + 31 - squash, 32, top + 36 - squash, "t");
  t.line(12, top + 18, 17, top + 18, "t");
  t.line(47, top + 18, 52, top + 18, "t");
  // corner studs
  for (const [x, y] of [[14, top + 2], [50, top + 2], [14, top + 33 - squash], [50, top + 33 - squash]]) t.ellipse(x, y, 1.6, 1.6, ["y", "x", "w"]);
  out.draw(ink(t), lean, 0);
  // sheen
  if (shine) {
    const s = new Layer(W, H);
    s.line(20 + shine * 3, top + 8, 26 + shine * 3, top + 8, "w");
    s.line(20 + shine * 3, top + 10, 24 + shine * 3, top + 10, "a");
    out.draw(s, lean, 0);
  }
  const f = new Layer(W, H);
  const ey = top + 15;
  eye(f, 24, ey, -1, blink, 3.6);
  eye(f, 40, ey, 1, blink, 3.6);
  smile(f, 32, ey + 8, mouth === "open");
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const tileAnims = animate(flytile, {
  idle: [{ shine: 1 }, { dy: 1, wob: 1, shine: 2 }, { dy: 1, blink: true, wob: 0, shine: 3 }, { dy: 0, wob: 1, shine: 2 }],
  attack: [{ dy: 1, squash: 3, mouth: "open" }, { dy: -3, lean: 3, wob: 1, mouth: "open", shine: 3 }, { lean: 1, mouth: "open", shine: 2 }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open" }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/flytile.ts", { id: "flytile", name: "FLYTILE", w: W, h: H, palette: TILE_PAL, fps: FPS, anims: tileAnims, script: "bridges2", comment: "Flyweight: a teal mosaic tile; the row of tiny tiles behind shares its glaze (intrinsic state) and differs only by position (extrinsic state)." });

// ----------------------------------------------------------------- PROXIFOX
// An orange fox holding a blank mask on a stick, with a faint ghost fox behind it (the real subject, loaded lazily).
const FOX_PAL = {
  k: "#2a140e", d: "#a24a1c", c: "#d9772c", b: "#f4a352", a: "#ffd9a0", // fox fur
  p: "#f4e6d0", q: "#ffffff", // cream chest/tail tip
  g: "#3d3a46", h: "#8d8a9a", i: "#d4d4e2", // mask
  u: "#6a5a9a", v: "#a89ad0", // ghost
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", e: "#7be0ff", y: "#d9a21b", x: "#ffd75a",
};
const FUR = ["d", "c", "b", "a"];
function proxifox({ dy = 0, lean = 0, blink = false, mouth = "smile", tail = 0, squash = 0, mask = 0 }) {
  const out = new Layer(W, H);
  // ghost of the real subject, a pale violet fox behind (created lazily)
  const gh = new Layer(W, H);
  gh.ellipse(46, 40 + dy, 11, 14, ["u", "v"], { bias: 0.1 });
  gh.poly([[38, 28 + dy], [41, 16 + dy], [45, 28 + dy]], ["u", "v"]);
  gh.poly([[47, 28 + dy], [51, 16 + dy], [54, 28 + dy]], ["u", "v"]);
  out.draw(ink(gh), lean, 0);
  const b = new Layer(W, H);
  const by = 44 + dy + squash;
  // tail with cream tip
  b.ellipse(10 - tail, by - 2 - tail, 8, 5, FUR, { bias: -0.1 });
  b.ellipse(5 - tail, by - 6 - tail, 3.4, 3, ["p", "q"], { bias: 0.1 });
  b.ellipse(22, 58, 5, 2.6, FUR, { bias: -0.2 });
  b.ellipse(38, 58, 5, 2.6, FUR, { bias: -0.3 });
  b.ellipse(30, by, 15, 12 - squash * 0.5, FUR, { bias: -0.05 });
  b.ellipse(30, by + 3, 8, 7, ["p", "q"], { bias: 0.05 });
  // head with ears
  b.poly([[14, 22 + dy], [17, 6 + dy], [24, 18 + dy]], FUR);
  b.poly([[36, 18 + dy], [43, 6 + dy], [46, 22 + dy]], FUR);
  b.ellipse(30, 26 + dy, 17, 12, FUR);
  b.ellipse(30, 31 + dy, 9, 5, ["p", "q"], { bias: 0.1 });
  ink(b);
  out.draw(b, lean, 0);
  const f = new Layer(W, H);
  const ey = 24 + dy;
  eye(f, 23, ey, -1, blink, 3.4);
  eye(f, 37, ey, 1, blink, 3.4);
  f.ellipse(30, 30 + dy, 1.8, 1.2, ["k", "d"]);
  if (mouth === "open") f.ellipse(30, 34 + dy, 3, 1.8, ["k", "m", "n"]);
  else f.line(28, 33 + dy, 32, 33 + dy, "k");
  f.outline("k");
  out.draw(f, lean, 0);
  // blank mask on a stick (the stand-in with the same face-shape as the real thing)
  const mk = new Layer(W, H);
  const mx = 50 - mask;
  mk.line(mx, 40 + dy, mx, 56, "g");
  mk.ellipse(mx, 36 + dy, 6, 7, ["g", "h", "i"], { bias: 0.1 });
  mk.set(mx - 2, 35 + dy, "k");
  mk.set(mx + 2, 35 + dy, "k");
  mk.line(mx - 1, 39 + dy, mx + 1, 39 + dy, "k");
  out.draw(ink(mk), lean, 0);
  return out;
}
const foxAnims = animate(proxifox, {
  idle: [{}, { dy: 1, tail: 1 }, { dy: 1, blink: true, tail: 2, mask: 1 }, { dy: 0, tail: 1 }],
  attack: [{ dy: 1, squash: 2, tail: -2, mask: -2, mouth: "open" }, { dy: -2, lean: 3, tail: 3, mask: 4, mouth: "open" }, { lean: 1, tail: 2, mask: 2, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", tail: -2 }, { dy: 1, lean: -1, blink: true, tail: -1 }],
});
emit("game/sprites/creatures/proxifox.ts", { id: "proxifox", name: "PROXIFOX", w: W, h: H, palette: FOX_PAL, fps: FPS, anims: foxAnims, script: "bridges2", comment: "Proxy: an orange fox holding a blank stand-in mask while the pale real subject waits behind it, loaded only when needed." });
