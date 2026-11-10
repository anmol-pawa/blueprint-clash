// The Behavioural Theatre Patternlings (part 3): MEDIOWL (Mediator), MEMENTORTOISE (Memento),
// VISITORB (Visitor). 64x64, idle 4 / attack 3 / hurt 2 / faint 4 / evolve 4.
// Run: node scripts/art/theatre3.mjs   (ART_PREVIEW=<dir> writes contact sheets)
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

// ------------------------------------------------------------------ MEDIOWL
// A round lavender operator with a headset and three cables to peer nodes; every message goes through the hub, never node to node.
const MO_PAL = {
  k: "#1c1230", d: "#4a3a8a", c: "#7a68c8", b: "#a898f0", a: "#e0d8ff",
  s: "#5a6a7a", t: "#8a9aa8", u: "#c4d0d8", y: "#d9a21b", x: "#ffd75a",
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", e: "#7be0ff", h: "#d8d8e0", g: "#3d3a46",
};
const LAV = ["d", "c", "b", "a"];
function mediowl({ dy = 0, lean = 0, blink = false, mouth = "smile", squash = 0, ping = 0 }) {
  const out = new Layer(W, H);
  const nodes = [[8, 20], [56, 20], [32, 8]];
  const cb = new Layer(W, H);
  nodes.forEach(([x, y], i) => {
    cb.line(32, 34 + dy, x, y, "t");
    cb.ellipse(x, y, 4.5, 4.5, i === ping % 3 ? ["y", "x", "z"] : ["s", "t", "u"], { bias: 0.1 });
  });
  out.draw(ink(cb), 0, 0);
  const b = new Layer(W, H);
  const by = 42 + dy + squash;
  b.ellipse(32, by, 16, 14 - squash * 0.5, LAV);
  b.ellipse(32, by - 14, 12, 10, LAV, { bias: 0.1 });
  b.poly([[22, by - 22], [26, by - 28], [28, by - 21]], LAV, () => 0.5);
  b.poly([[42, by - 22], [38, by - 28], [36, by - 21]], LAV, () => 0.5);
  b.ellipse(26, 58, 4, 2.4, LAV, { bias: -0.3 });
  b.ellipse(38, 58, 4, 2.4, LAV, { bias: -0.3 });
  ink(b);
  out.draw(b, lean, 0);
  const hs = new Layer(W, H);
  hs.line(20, by - 14, 20, by - 8, "g");
  hs.ellipse(19, by - 7, 2.4, 2.4, ["g", "h"]);
  hs.line(20, by - 8, 24, by - 3, "g");
  out.draw(ink(hs), lean, 0);
  const hub = new Layer(W, H);
  hub.ellipse(32, by + 3, 5, 5, ["g", "h", "w"], { bias: 0.1 });
  hub.set(32, by + 3, ping % 2 ? "x" : "m");
  out.draw(ink(hub), lean, 0);
  const f = new Layer(W, H);
  const ey = by - 14;
  eye(f, 27, ey, -1, blink, 3.6);
  eye(f, 37, ey, 1, blink, 3.6);
  if (mouth === "open") f.ellipse(32, ey + 6, 2.4, 1.6, ["k", "m", "n"]);
  else f.line(30, ey + 6, 34, ey + 6, "k");
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const moAnims = animate(mediowl, {
  idle: [{ ping: 0 }, { dy: 1, ping: 1 }, { dy: 1, blink: true, ping: 2 }, { dy: 0, ping: 0 }],
  attack: [{ dy: 1, squash: 2, ping: 0, mouth: "open" }, { dy: -2, lean: 3, ping: 1, mouth: "open" }, { lean: 1, ping: 2, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open" }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/mediowl.ts", { id: "mediowl", name: "MEDIOWL", w: W, h: H, palette: MO_PAL, fps: FPS, anims: moAnims, script: "theatre3", comment: "Mediator: a headset operator at the centre of three cables; peers talk to the hub, never to each other." });

// ----------------------------------------------------------- MEMENTORTOISE
// A moss tortoise with a sealed hatch in its shell; a faint ghost copy of the shell beside it is the saved snapshot.
const MT_PAL = {
  k: "#142418", d: "#2e5a34", c: "#4e8a48", b: "#86bc6a", a: "#d0f0a8",
  r: "#6a4a22", s: "#a67a3a", t: "#d9b060", u: "#f5dd9a",
  y: "#d9a21b", x: "#ffd75a", i: "#7be0ff", j: "#bfeeff",
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", e: "#7be0ff", h: "#d8d8e0", g: "#3d3a46",
};
const MOSS = ["d", "c", "b", "a"];
function mementortoise({ dy = 0, lean = 0, blink = false, mouth = "smile", squash = 0, hatch = 0, ghost = 1 }) {
  const out = new Layer(W, H);
  if (ghost) {
    const gh = new Layer(W, H);
    gh.ellipse(14, 30, 10, 8, ["i", "j", "w"], { bias: 0.2 });
    gh.line(8, 30, 20, 30, "w");
    out.draw(ink(gh), 0, 0);
  }
  const b = new Layer(W, H);
  const by = 38 + dy + squash;
  for (const x of [26, 46]) b.ellipse(x, 57, 4.2, 3, MOSS, { bias: -0.3 });
  b.ellipse(48, by - 2, 10, 8, MOSS, { bias: 0.1 });
  b.ellipse(32, by + 2, 20, 16 - squash * 0.5, ["r", "s", "t", "u"]);
  b.ellipse(32, by - 4, 15, 9, ["r", "s", "t", "u"], { bias: 0.2 });
  ink(b);
  out.draw(b, lean, 0);
  const hc = new Layer(W, H);
  hc.poly([[26, by - 4], [38, by - 4], [38, by + 8], [26, by + 8]], ["g", "h"], () => 0.5);
  hc.line(26, by + 2, 38, by + 2, "k");
  const lit = hatch % 2 === 1;
  hc.ellipse(32, by + 2, 3, 3, lit ? ["y", "x", "z"] : ["d", "c", "b"], { bias: 0.1 });
  out.draw(ink(hc), lean, 0);
  const f = new Layer(W, H);
  const ey = by - 4;
  eye(f, 51, ey, 1, blink, 3.4);
  if (mouth === "open") f.ellipse(56, ey + 5, 2.4, 1.6, ["k", "m", "n"]);
  else f.line(52, ey + 5, 57, ey + 5, "k");
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const mtAnims = animate(mementortoise, {
  idle: [{ hatch: 0 }, { dy: 1, hatch: 0 }, { dy: 1, blink: true, hatch: 1 }, { dy: 0, hatch: 1, ghost: 0 }],
  attack: [{ dy: 1, squash: 2, hatch: 1, mouth: "open" }, { dy: -2, lean: 3, hatch: 0, mouth: "open" }, { lean: 1, hatch: 1, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open" }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/mementortoise.ts", { id: "mementortoise", name: "MEMENTORTOISE", w: W, h: H, palette: MT_PAL, fps: FPS, anims: mtAnims, script: "theatre3", comment: "Memento: a tortoise with a sealed hatch in its shell; the ghost shell is the opaque snapshot only it can reopen." });

// ----------------------------------------------------------------- VISITORB
// A hovering indigo orb with a lens-eye and a ring; a beam visits one of three shapes (square, circle, triangle) on the ground.
const VO_PAL = {
  k: "#12142e", d: "#2a3a8a", c: "#4a68c8", b: "#80a0f0", a: "#d0e0ff",
  r: "#a83a3a", s: "#e0605a", o: "#2e7a3c", p: "#5ab84e", q: "#d9a21b", x: "#ffd75a",
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", e: "#7be0ff", h: "#d8d8e0", g: "#3d3a46",
};
const INDIGO = ["d", "c", "b", "a"];
function visitorb({ dy = 0, lean = 0, blink = false, mouth = "smile", squash = 0, at = 0, spin = 0 }) {
  const out = new Layer(W, H);
  const sh = new Layer(W, H);
  const xs = [14, 32, 50];
  sh.poly([[xs[0] - 5, 58], [xs[0] + 5, 58], [xs[0] + 5, 50], [xs[0] - 5, 50]], at % 3 === 0 ? ["q", "x"] : ["r", "s"], () => 0.5);
  sh.ellipse(xs[1], 54, 5, 5, at % 3 === 1 ? ["q", "x"] : ["o", "p"]);
  sh.poly([[xs[2] - 6, 58], [xs[2] + 6, 58], [xs[2], 48]], at % 3 === 2 ? ["q", "x"] : ["d", "c"], () => 0.5);
  out.draw(ink(sh), 0, 0);
  const bm = new Layer(W, H);
  const oy = 24 + dy + squash;
  bm.line(32, oy + 12, xs[at % 3], 46, "z");
  out.draw(bm, 0, 0);
  const b = new Layer(W, H);
  b.ellipse(32, oy, 14, 13 - squash * 0.5, INDIGO);
  ink(b);
  out.draw(b, lean, 0);
  const rg = new Layer(W, H);
  for (let a = 0; a < 6.3; a += 0.2) {
    const x = 32 + Math.cos(a + spin) * 20;
    const y = oy + 2 + Math.sin(a + spin) * 5;
    if (Math.sin(a + spin) > -0.2) rg.set(x, y, "h");
  }
  out.draw(rg, lean, 0);
  const f = new Layer(W, H);
  eye(f, 32, oy, 1, blink, 6);
  if (mouth === "open") f.ellipse(32, oy + 10, 2.4, 1.6, ["k", "m", "n"]);
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const voAnims = animate(visitorb, {
  idle: [{ at: 0, spin: 0 }, { dy: 1, at: 1, spin: 0.8 }, { dy: 1, blink: true, at: 2, spin: 1.6 }, { dy: 0, at: 1, spin: 2.4 }],
  attack: [{ dy: 1, squash: 2, at: 0, mouth: "open" }, { dy: -2, lean: 3, at: 1, mouth: "open", spin: 1 }, { lean: 1, at: 2, mouth: "open", spin: 2 }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open" }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/visitorb.ts", { id: "visitorb", name: "VISITORB", w: W, h: H, palette: VO_PAL, fps: FPS, anims: voAnims, script: "theatre3", comment: "Visitor: a hovering lens-orb whose beam visits each shape in turn; new operations are new orbs, the shapes stay put." });
