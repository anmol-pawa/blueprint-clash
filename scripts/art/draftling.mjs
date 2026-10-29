// DRAFTLING, the starter Patternling: a plump blueprint-blue critter whose
// pencil tail draws structure. Set-square ears, a compass antenna and a
// ruler-tick belly say "this one plans before it builds".
// Run: node scripts/art/draftling.mjs   (ART_PREVIEW=<dir> writes a contact sheet)
import { Layer, dissolve, emit, scaleLayer, sparkle, whiten } from "./paint.mjs";

const W = 64;
const H = 64;
const palette = {
  k: "#0b1b33", // outline
  d: "#1c3f7a", // blueprint-blue body ramp, dark → light
  c: "#2f66b8",
  b: "#4f95e0",
  a: "#a4d4ff",
  p: "#b79e62", // paper belly ramp
  q: "#efe3b8",
  r: "#fff8dc",
  t: "#b5650f", // pencil yellow ramp
  u: "#f0b429",
  v: "#ffe27a",
  s: "#1f8f8a", // set-square plastic ramp
  x: "#4cc9bd",
  z: "#b6fff0",
  g: "#343a46", // graphite / ferrule
  h: "#8a93a3",
  m: "#c4506a", // eraser / mouth
  n: "#ff9fb0",
  w: "#ffffff",
  e: "#7be0ff", // grid-line cyan
};
const BODY = ["d", "c", "b", "a"];
const PAPER = ["p", "q", "r"];
const WOOD = ["t", "u", "v"];
const SQ = ["s", "x", "z"];

/** The pencil tail: sharpened tip out, eraser ferrule tucked behind the body. */
function tailLayer(dy, ang) {
  const L = new Layer(W, H);
  const bx = 41;
  const by = 50 + dy;
  const len = 19;
  const a = (-48 + ang) * (Math.PI / 180);
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const nx = -uy;
  const ny = ux;
  const P = (t, o) => [bx + ux * t + nx * o, by + uy * t + ny * o];
  // barrel
  L.poly([P(0, -3), P(len, -3), P(len, 3), P(0, 3)], WOOD, (x, y) => 0.5 + ((x - bx) * nx + (y - by) * ny) / -8);
  // ferrule + eraser at the root
  L.poly([P(0, -3), P(3, -3), P(3, 3), P(0, 3)], ["g", "h"], (x, y) => 0.5 + ((x - bx) * nx + (y - by) * ny) / -7);
  L.poly([P(-3, -3), P(0, -3), P(0, 3), P(-3, 3)], ["m", "n"], (x, y) => 0.4 + ((x - bx) * nx + (y - by) * ny) / -8);
  // sharpened wood cone and graphite point
  L.poly([P(len, -3), P(len + 5, -1), P(len + 5, 1), P(len, 3)], ["q", "r"], () => 0.4);
  L.poly([P(len + 5, -1), P(len + 8, 0), P(len + 5, 1)], "g");
  L.outline("k");
  return L;
}

/** Set-square ear (a right triangle with a window cut out) on side s. */
function earLayer(s, dy, tilt) {
  const L = new Layer(W, H);
  const X = (x) => 32 + s * x;
  const top = 5 + dy + tilt;
  L.poly([[X(15), 21 + dy], [X(15), top], [X(27), 21 + dy + tilt * 0.5]], SQ, (x, y) => 0.85 - (y - top) / 28 - (s > 0 ? 0.2 : 0));
  // window
  for (let y = top + 8; y < 20 + dy; y++) for (let x = 0; x < W; x++) if (Math.abs(x - X(18.5)) < Math.max(0, (y - top - 8) * 0.32)) L.px[y][x] = ".";
  L.outline("k");
  // degree ticks along the hypotenuse
  for (let i = 1; i < 4; i++) L.set(X(15 + i * 2.5), 21 + dy + tilt * 0.5 - i * 3.5, "z");
  return L;
}

/**
 * pose: dy body drop, tail pencil angle offset, blink, mouth ('smile'|'open'|'oh'),
 * arms (0 down … 1 raised), lean (px forward), cheeks.
 */
function frame({ dy = 0, tail = 0, blink = false, mouth = "smile", arms = 0, lean = 0, squash = 0, ear = 0 }) {
  const out = new Layer(W, H);
  out.draw(tailLayer(dy, tail), lean, 0);

  const body = new Layer(W, H);
  const by = 44 + dy + squash;
  // feet
  body.ellipse(24, 57 + dy * 0.2, 6, 3, BODY, { bias: -0.2 });
  body.ellipse(40, 57 + dy * 0.2, 6, 3, BODY, { bias: -0.3 });
  // arms
  const ay = 45 + dy - arms * 10;
  body.ellipse(17, ay, 4, 5 - arms, BODY, { bias: 0 });
  body.ellipse(47, ay, 4, 5 - arms, BODY, { bias: -0.25 });
  // torso and belly
  body.ellipse(32, by, 13, 12 - squash * 0.5, BODY, { bias: -0.05 });
  body.ellipse(32, by + 2, 8.5, 8.5 - squash * 0.4, PAPER, { bias: 0.05 });
  for (let i = 0; i < 5; i++) {
    const y = Math.round(by - 3 + i * 3);
    const len = i % 2 === 0 ? 4 : 2;
    for (let k = 0; k < len; k++) body.set(25 + k, y, "p");
  }
  // head
  body.ellipse(32, 27 + dy, 15, 12.5, BODY);
  body.outline("k");
  out.draw(body, lean, 0);

  // ears behind-the-face accents
  out.draw(earLayer(-1, dy, ear), lean, 0);
  out.draw(earLayer(1, dy, ear), lean, 0);

  // compass antenna with a gold hinge
  const c = new Layer(W, H);
  c.line(32, 9 + dy, 28, 16 + dy, "h");
  c.line(32, 9 + dy, 36, 16 + dy, "g");
  c.set(28, 17 + dy, "g");
  c.set(32, 8 + dy, "v");
  c.set(32, 9 + dy, "u");
  c.set(31, 9 + dy, "t");
  c.set(33, 9 + dy, "t");
  c.outline("k");
  out.draw(c, lean, 0);

  // face
  const f = new Layer(W, H);
  const ey = 28 + dy;
  for (const [ex, s] of [[25, -1], [39, 1]]) {
    if (blink) {
      f.line(ex - 3, ey + 1, ex + 3, ey + 1, "k");
      f.line(ex - 2, ey + 2, ex + 2, ey + 2, "d");
    } else {
      f.ellipse(ex, ey, 4.6, 5.2, ["h", "w", "w"], { bias: 0.3 });
      f.ellipse(ex + s * 0.6, ey + 0.6, 2.4, 3.2, ["k", "d"], { bias: -0.4 });
      f.set(ex + s * 0.6 - 1, ey - 1, "w");
      f.set(ex + s * 0.6, ey + 2, "e");
    }
    f.set(ex + s * 1, ey + 6, "n");
    f.set(ex + s * 2, ey + 6, "n");
    f.set(ex + s * 3, ey + 6, "n");
  }
  const my = 35 + dy;
  if (mouth === "open") {
    f.ellipse(32, my + 1, 3.5, 3, ["k", "m", "n"], { bias: -0.1 });
    f.set(31, my - 1, "w");
    f.set(33, my - 1, "w");
  } else if (mouth === "oh") {
    f.ellipse(32, my + 1, 2, 2.4, ["k", "m"], { bias: -0.2 });
  } else {
    f.line(29, my, 30, my + 1, "k");
    f.line(30, my + 1, 34, my + 1, "k");
    f.line(34, my + 1, 35, my, "k");
  }
  out.draw(f, lean, 0);
  return out;
}

const idle = [
  frame({ dy: 0, tail: 0 }),
  frame({ dy: 1, tail: 6, arms: 0 }),
  frame({ dy: 1, tail: 10, blink: true }),
  frame({ dy: 0, tail: 4, ear: 1 }),
];
const attack = [
  frame({ dy: 1, squash: 2, tail: -20, arms: 0.2, mouth: "oh" }),
  frame({ dy: -2, lean: 3, tail: 24, arms: 1, mouth: "open", ear: -1 }),
  frame({ dy: 0, lean: 2, tail: 18, arms: 0.6, mouth: "open" }),
];
const hurt = [
  frame({ dy: 2, lean: -2, blink: true, mouth: "oh", tail: -14, ear: 2 }),
  frame({ dy: 1, lean: -1, blink: true, mouth: "oh", tail: -8, ear: 1 }),
];
const f0 = frame({ dy: 1, blink: true, mouth: "oh" });
const faint = [f0, dissolve(f0, 0.15, 3), dissolve(f0, 0.5, 6), dissolve(f0, 0.85, 9)];
const base = frame({});
const evolve = [whiten(base, 0.4, "w"), scaleLayer(whiten(base, 1, "w"), 1.12, 0.92, 32, 58), scaleLayer(whiten(base, 1, "w"), 0.94, 1.1, 32, 58), sparkle(whiten(base, 1, "w"), 50, 14, 3, "z", "w")];

emit("game/sprites/creatures/draftling.ts", {
  id: "draftling",
  name: "DRAFTLING",
  w: W,
  h: H,
  palette,
  fps: { idle: 4, attack: 8, hurt: 8, faint: 6, evolve: 6 },
  anims: { idle, attack, hurt, faint, evolve },
  comment: "The starter Patternling: a blueprint-blue critter with set-square ears, a compass antenna, a ruler-tick belly and a pencil tail.",
});
