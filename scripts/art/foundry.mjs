// The Creational Foundry Patternlings: FORGEBOT (Factory), BEAVERBUILD (Builder),
// SOLO (Singleton), CLONEWISP (Prototype). 64x64, idle 4 / attack 3 / hurt 2 / faint 4 / evolve 4.
// Run: node scripts/art/foundry.mjs   (ART_PREVIEW=<dir> writes contact sheets)
import { Layer, dissolve, emit, scaleLayer, sparkle, whiten } from "./paint.mjs";

const W = 64;
const H = 64;

/** Build the five standard animations from a pose function. */
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
/** Axis-aligned shaded box with a left-to-right and top-to-bottom light gradient. */
function box(L, x0, y0, x1, y1, ramp, bias = 0) {
  L.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], ramp, (x, y) => 0.62 + bias - (x - x0) / (x1 - x0) * 0.3 - (y - y0) / (y1 - y0) * 0.22);
}
const ink = (L) => L.outline("k");

// ---------------------------------------------------------------- FORGEBOT
const FORGE_PAL = {
  k: "#1a1420", d: "#2b3a52", c: "#4a6285", b: "#7391b8", a: "#c2d6ee", // steel
  t: "#7a2b0e", u: "#d6561a", v: "#ffa43a", y: "#ffe58a", // furnace
  g: "#3a3a44", h: "#8a8a9a", // iron
  w: "#ffffff", z: "#ffd9a0", e: "#7be0ff",
};
const STEEL = ["d", "c", "b", "a"];
const FIRE = ["t", "u", "v", "y"];
const IRON = ["g", "h", "a"];
function forgebot({ dy = 0, lean = 0, blink = false, mouth = "smile", arm = 0, glow = 0, squash = 0, smoke = 0 }) {
  const out = new Layer(W, H);
  // little product coming off the line (what a factory makes)
  const prod = new Layer(W, H);
  box(prod, 50, 52, 58, 58, STEEL, -0.1);
  prod.ellipse(54, 50, 3, 2, STEEL);
  out.draw(ink(prod));
  const body = new Layer(W, H);
  const by = 45 + dy + squash;
  // treads
  body.ellipse(24, 58, 8, 3.2, IRON, { bias: -0.1 });
  body.ellipse(40, 58, 8, 3.2, IRON, { bias: -0.2 });
  for (const x of [19, 24, 29, 35, 40, 45]) body.set(x, 58, "d");
  // torso
  box(body, 18, by - 10, 46, by + 10 - squash, STEEL);
  body.ellipse(32, by + 1, 8.5, 7.5, FIRE, { bias: 0.08 + glow * 0.3 });
  for (let i = -1; i <= 1; i++) body.line(25, by + 1 + i * 3, 39, by + 1 + i * 3, "t");
  // rivets
  for (const [x, y] of [[20, by - 8], [44, by - 8], [20, by + 7], [44, by + 7]]) body.set(x, y, "a");
  // head
  box(body, 21, 12 + dy, 43, 29 + dy, STEEL, 0.05);
  body.poly([[24, 19 + dy], [40, 19 + dy], [40, 25 + dy], [24, 25 + dy]], ["k", "d"], () => 0.2);
  // chimney
  box(body, 26, 6 + dy, 31, 12 + dy, IRON);
  body.set(24, 12 + dy, "h");
  ink(body);
  out.draw(body, lean, 0);
  // glowing visor eye
  const f = new Layer(W, H);
  const ey = 22 + dy;
  if (blink) f.line(26, ey, 38, ey, "u");
  else {
    f.poly([[26, ey - 2], [38, ey - 2], [38, ey + 2], [26, ey + 2]], FIRE, (x) => 0.35 + Math.abs(x - 32) / -30 + 0.5);
    f.set(29, ey - 1, "w");
    f.set(35, ey - 1, "w");
  }
  if (mouth === "open") f.poly([[29, 26 + dy], [35, 26 + dy], [35, 28 + dy], [29, 28 + dy]], "k");
  else if (mouth === "grin") for (let x = 28; x <= 36; x += 2) f.set(x, 27 + dy, "k");
  out.draw(f, lean, 0);
  // smoke puffs
  const s = new Layer(W, H);
  s.ellipse(29, 3 + dy - smoke, 2.5, 2, ["h", "a", "w"]);
  if (smoke) s.ellipse(33, -1 + dy, 2, 1.5, ["h", "a"]);
  out.draw(s, lean, 0);
  // hammer arm
  const a = new Layer(W, H);
  const ang = (-70 + arm * 150) * (Math.PI / 180);
  const sx = 46 + lean;
  const sy = by - 5;
  const hx = sx + Math.cos(ang) * 13;
  const hy = sy + Math.sin(ang) * 13;
  a.line(sx, sy, hx, hy, "h");
  a.line(sx, sy + 1, hx, hy + 1, "g");
  a.ellipse(hx, hy, 4.2, 3.4, IRON, { bias: 0.1 });
  a.set(hx - 1, hy - 1, "a");
  out.draw(ink(a));
  return out;
}
const forgeAnims = animate(forgebot, {
  idle: [{}, { dy: 1, glow: 0.4, smoke: 1 }, { dy: 1, blink: true, glow: 1, smoke: 3 }, { dy: 0, glow: 0.5, smoke: 5 }],
  attack: [{ arm: -0.1, squash: 2, dy: 1, glow: 1, mouth: "open" }, { arm: 0.9, lean: -3, glow: 1, mouth: "grin" }, { arm: 0.55, lean: -1, glow: 0.6, mouth: "grin" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open" }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/forgebot.ts", { id: "forgebot", name: "FORGEBOT", w: W, h: H, palette: FORGE_PAL, fps: { idle: 4, attack: 8, hurt: 8, faint: 6, evolve: 6 }, anims: forgeAnims, script: "foundry", comment: "Factory Method: a steel foundry-bot with a furnace belly and a hammer, stamping out a fresh product on each call." });

// -------------------------------------------------------------- BEAVERBUILD
const BEAV_PAL = {
  k: "#24140d", d: "#5a321a", c: "#85502a", b: "#b3743c", a: "#dfa468", // fur
  p: "#b8895a", q: "#efd6a8", r: "#fff3d8", // belly + teeth
  t: "#8a2f1f", u: "#c9532f", v: "#ee8a5e", // bricks
  g: "#3d3a46", h: "#8d8a9a", // tools
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", e: "#7be0ff",
};
const FUR = ["d", "c", "b", "a"];
const BELLY = ["p", "q", "r"];
const BRICK = ["t", "u", "v"];
function beaver({ dy = 0, lean = 0, blink = false, mouth = "smile", bricks = 2, tail = 0, arms = 0, squash = 0 }) {
  const out = new Layer(W, H);
  // flat paddle tail
  const t = new Layer(W, H);
  t.poly([[40, 50 + dy], [60, 44 + dy - tail], [62, 56 + dy - tail], [42, 58 + dy]], ["d", "c", "b"], (x, y) => 0.45 + (x - 40) / 60 - (y - 44) / 40);
  for (let i = 0; i < 4; i++) t.line(46 + i * 4, 48 + dy - tail * (0.5 + i * 0.1), 47 + i * 4, 57 + dy - tail * 0.2, "d");
  out.draw(ink(t), lean, 0);
  // stack of bricks (the Builder adds one part per call)
  const st = new Layer(W, H);
  for (let i = 0; i < bricks; i++) box(st, 3 + (i % 2) * 2, 57 - i * 6, 15 + (i % 2) * 2, 62 - i * 6, BRICK, i * 0.04);
  out.draw(ink(st));
  const b = new Layer(W, H);
  const by = 46 + dy + squash;
  b.ellipse(23, 58, 6, 3, FUR, { bias: -0.2 });
  b.ellipse(39, 58, 6, 3, FUR, { bias: -0.3 });
  b.ellipse(32, by, 14, 12 - squash * 0.5, FUR, { bias: -0.05 });
  b.ellipse(32, by + 2, 9, 8.5, BELLY, { bias: 0.05 });
  // arms holding a brick
  const ay = 46 + dy - arms * 9;
  b.ellipse(18, ay, 4, 5, FUR);
  b.ellipse(46, ay, 4, 5, FUR, { bias: -0.25 });
  // head
  b.ellipse(21, 17 + dy, 4, 4.5, FUR, { bias: -0.1 });
  b.ellipse(43, 17 + dy, 4, 4.5, FUR, { bias: -0.2 });
  b.ellipse(32, 28 + dy, 15, 12.5, FUR);
  b.ellipse(32, 34 + dy, 8, 5.5, BELLY, { bias: 0.1 });
  ink(b);
  out.draw(b, lean, 0);
  // held brick
  if (arms > 0.3) {
    const hb = new Layer(W, H);
    box(hb, 40, 33 + dy - arms * 8, 54, 40 + dy - arms * 8, BRICK);
    out.draw(ink(hb), lean, 0);
  }
  // tool belt with trowel
  const bt = new Layer(W, H);
  bt.poly([[19, by + 3], [45, by + 3], [45, by + 6], [19, by + 6]], ["g", "h"], () => 0.3);
  bt.set(32, by + 4, "z");
  bt.poly([[39, by + 6], [43, by + 6], [41, by + 12]], ["h", "a"], () => 0.7);
  out.draw(ink(bt), lean, 0);
  // face
  const f = new Layer(W, H);
  const ey = 27 + dy;
  for (const [ex, s] of [[25, -1], [39, 1]]) {
    if (blink) f.line(ex - 3, ey + 1, ex + 3, ey + 1, "k");
    else {
      f.ellipse(ex, ey, 4.4, 5, ["h", "w", "w"], { bias: 0.3 });
      f.ellipse(ex + s * 0.5, ey + 0.6, 2.3, 3, ["k", "d"], { bias: -0.4 });
      f.set(ex + s * 0.5 - 1, ey - 1, "w");
    }
  }
  f.ellipse(32, 33 + dy, 2.4, 1.6, ["k", "d"]);
  if (mouth === "open") f.ellipse(32, 38 + dy, 3.5, 2.6, ["k", "m", "n"]);
  else {
    f.line(30, 36 + dy, 31, 37 + dy, "k");
    f.line(33, 37 + dy, 34, 36 + dy, "k");
  }
  // buck teeth
  f.poly([[30, 35 + dy], [34, 35 + dy], [34, 40 + dy], [30, 40 + dy]], BELLY, () => 0.95);
  f.line(32, 36 + dy, 32, 40 + dy, "p");
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const beaverAnims = animate(beaver, {
  idle: [{}, { dy: 1, tail: 2, bricks: 3 }, { dy: 1, blink: true, tail: 4, bricks: 3 }, { dy: 0, tail: 1, bricks: 2 }],
  attack: [{ dy: 1, squash: 2, arms: 0.2, tail: -3 }, { dy: -2, lean: 3, arms: 1, tail: 6, mouth: "open" }, { lean: 2, arms: 0.6, tail: 4, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", tail: -4 }, { dy: 1, lean: -1, blink: true, tail: -2 }],
});
emit("game/sprites/creatures/beaverbuild.ts", { id: "beaverbuild", name: "BEAVERBUILD", w: W, h: H, palette: BEAV_PAL, fps: { idle: 4, attack: 8, hurt: 8, faint: 6, evolve: 6 }, anims: beaverAnims, script: "foundry", comment: "Builder: a tool-belted beaver who lays one brick per step and only hands over the finished wall at build()." });

// --------------------------------------------------------------------- SOLO
const SOLO_PAL = {
  k: "#150f24", d: "#322552", c: "#54408a", b: "#7c62b8", a: "#b8a2ec", // violet
  g: "#3a3a44", h: "#8a8a9a", i: "#c8c8d8", // fence + lock
  u: "#d9a21b", v: "#ffd75a", // halo gold
  m: "#c4506a", w: "#ffffff", z: "#d8f0ff", e: "#ff5d73",
};
const VIO = ["d", "c", "b", "a"];
const FENCE = ["g", "h", "i"];
function solo({ dy = 0, lean = 0, blink = false, mouth = "sad", pulse = 0, squash = 0, flare = 0 }) {
  const out = new Layer(W, H);
  // halo: exactly one ring (there can be only one instance)
  const hl = new Layer(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x + 0.5 - 32) / (10 + flare), (y + 0.5 - (7 + dy)) / 3);
    if (d <= 1 && d >= 0.62) hl.set(x, y, d > 0.8 ? "u" : "v");
  }
  out.draw(hl, lean, 0);
  const b = new Layer(W, H);
  const by = 38 + dy + squash;
  // teardrop body
  b.ellipse(32, by + 6, 15, 14 - squash * 0.5, VIO, { bias: -0.05 });
  b.ellipse(32, by - 8, 11, 12, VIO);
  // little stub arms
  b.ellipse(16, by + 8, 3, 4, VIO, { bias: -0.1 });
  b.ellipse(48, by + 8, 3, 4, VIO, { bias: -0.3 });
  ink(b);
  out.draw(b, lean, 0);
  // one big eye
  const f = new Layer(W, H);
  const ey = 28 + dy;
  if (blink) f.line(24, ey + 1, 40, ey + 1, "k");
  else {
    f.ellipse(32, ey, 9, 8, ["h", "z", "w"], { bias: 0.3 });
    f.ellipse(32 + pulse, ey + 1, 4.5, 5.2, ["k", "d", "e"], { bias: -0.2 });
    f.set(30 + pulse, ey - 1, "w");
    f.set(31 + pulse, ey - 1, "w");
  }
  if (mouth === "open") f.ellipse(32, 42 + dy, 3.2, 2.6, ["k", "m"]);
  else f.line(28, 43 + dy, 36, 41 + dy, "k"), f.line(28, 43 + dy, 28, 42 + dy, "k");
  f.outline("k");
  out.draw(f, lean, 0);
  // fence ring in front: Solo's constructor is private
  const fn = new Layer(W, H);
  fn.line(8, 57, 56, 57, "h");
  for (let x = 10; x <= 54; x += 6) {
    fn.poly([[x - 1, 51], [x + 1, 51], [x + 1, 59], [x - 1, 59]], FENCE, (px) => 0.35 + (px - x) * 0.3);
    fn.set(x, 50, "i");
  }
  out.draw(ink(fn));
  // padlock
  const lk = new Layer(W, H);
  box(lk, 29, 53, 35, 59, ["u", "v"]);
  lk.ellipse(32, 51, 2.5, 2.4, ["g", "h"]);
  lk.set(32, 55, "k");
  out.draw(ink(lk));
  return out;
}
const soloAnims = animate(solo, {
  idle: [{}, { dy: -1, pulse: -1, flare: 1 }, { dy: 0, blink: true, flare: 0 }, { dy: -1, pulse: 1, flare: 1 }],
  attack: [{ squash: 3, dy: 1, pulse: -1 }, { dy: -3, flare: 5, mouth: "open", pulse: 1 }, { dy: -1, flare: 3, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open" }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/solo.ts", { id: "solo", name: "SOLO", w: W, h: H, palette: SOLO_PAL, fps: { idle: 3, attack: 8, hurt: 8, faint: 6, evolve: 6 }, anims: soloAnims, script: "foundry", comment: "Singleton: a lonely one-eyed violet creature behind a fence with a padlock; one ring, one instance, slightly cursed." });

// ---------------------------------------------------------------- CLONEWISP
const WISP_PAL = {
  k: "#08242e", d: "#0f5d70", c: "#1f93a8", b: "#52c9d6", a: "#aef4f0", // wisp teal
  p: "#7be0ff", q: "#d4faff", // glow
  m: "#e85d9c", n: "#ffb0d6", w: "#ffffff", z: "#ffffff", e: "#7be0ff",
};
const TEAL = ["d", "c", "b", "a"];
function wisp(L, cx, cy, s, { blink, mouth, tailSway }) {
  L.ellipse(cx, cy, 13 * s, 12 * s, TEAL, { bias: 0.1 });
  // flame-like tail
  for (let i = 1; i <= 5; i++) {
    const r = (9 - i * 1.5) * s;
    L.ellipse(cx + Math.sin(i * 0.9 + tailSway) * 3 * s, cy + 10 * s + i * 3 * s, Math.max(1.5, r), 3 * s, TEAL, { bias: 0.1 - i * 0.04 });
  }
  L.ellipse(cx, cy - 12 * s, 3 * s, 4 * s, TEAL, { bias: 0.15 }); // topknot
  const ey = cy - 1 * s;
  for (const [ex, sg] of [[cx - 6 * s, -1], [cx + 6 * s, 1]]) {
    if (blink) L.line(ex - 2 * s, ey + 1, ex + 2 * s, ey + 1, "k");
    else {
      L.ellipse(ex, ey, 3.8 * s, 4.4 * s, ["k", "q", "w"], { bias: 0.35 });
      L.ellipse(ex + sg * 0.5, ey + 0.6, 2 * s, 2.7 * s, ["k", "d"], { bias: -0.4 });
      L.set(ex - 1, ey - 1, "w");
    }
  }
  if (mouth === "open") L.ellipse(cx, cy + 6 * s, 3 * s, 2.4 * s, ["k", "m", "n"]);
  else {
    L.line(cx - 2 * s, cy + 5 * s, cx - 1 * s, cy + 6 * s, "k");
    L.line(cx - 1 * s, cy + 6 * s, cx + 2 * s, cy + 6 * s, "k");
  }
}
function clonewisp({ dy = 0, lean = 0, blink = false, mouth = "smile", echo = 0.5, sway = 0, squash = 0 }) {
  const out = new Layer(W, H);
  // the half-formed copy (dithered more when it has just split off)
  if (echo > 0) {
    const e = new Layer(W, H);
    wisp(e, 49, 38 + dy * 0.5, 0.7, { blink: false, mouth: "smile", tailSway: sway + 1 });
    e.outline("k");
    const f = dissolve(e, 1 - echo, 0);
    out.draw(f, 0, 0);
  }
  const m = new Layer(W, H);
  wisp(m, 28 + lean, 24 + dy + squash, 1, { blink, mouth, tailSway: sway });
  m.outline("k");
  out.draw(m);
  // sparkle motes
  out.set(10, 14 + dy, "q");
  out.set(11, 14 + dy, "p");
  out.set(56, 16 + dy, "p");
  return out;
}
const wispAnims = animate(clonewisp, {
  idle: [{ echo: 0.5 }, { dy: 1, echo: 0.65, sway: 1 }, { dy: 1, blink: true, echo: 0.8, sway: 2 }, { dy: 0, echo: 0.6, sway: 3 }],
  attack: [{ dy: 1, squash: 2, echo: 0.2, mouth: "open" }, { dy: -2, lean: 6, echo: 1, mouth: "open", sway: 1 }, { lean: 3, echo: 0.9, mouth: "open", sway: 2 }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", echo: 0.2 }, { dy: 1, lean: -1, blink: true, echo: 0.3 }],
});
emit("game/sprites/creatures/clonewisp.ts", { id: "clonewisp", name: "CLONEWISP", w: W, h: H, palette: WISP_PAL, fps: { idle: 4, attack: 8, hurt: 8, faint: 6, evolve: 6 }, anims: wispAnims, script: "foundry", comment: "Prototype: a teal wisp with a half-formed copy beside it that solidifies when it clones itself." });
