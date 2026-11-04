// FOREMAN CORVO, master of the Creational Foundry (96×96 master sprite).
// A broad foreman in forest-green coveralls with orange hi-vis bands, a close
// grey crop, square glasses and a pencil behind the ear. One fist holds an
// adjustable wrench (the "builder" tool); the other swings a big rubber stamp
// that leaves a row of identical crates (the factory/prototype idea: one mould,
// many products). Run: node scripts/art/corvo.mjs   (ART_PREVIEW=<dir> writes a contact sheet)
import { Layer, dissolve, emit } from "./paint.mjs";

const palette = {
  k: "#0a0f0c",
  // forest-green coveralls
  a: "#10281a", b: "#1f4a2c", c: "#357a46", d: "#5fb06a",
  // skin
  e: "#7a4a35", f: "#b07454", g: "#dca07a", h: "#f4cba5",
  // grey hair
  i: "#4d525e", j: "#858b99", l: "#bcc2cf", m: "#e8ebf2",
  // hi-vis orange
  n: "#7a3a0c", o: "#d6711c", p: "#ffa53d", q: "#ffd88a",
  // steel
  r: "#2c3340", s: "#566074", t: "#8f9bb0", u: "#d3dbe8",
  // leather belt / boots
  v: "#2b1810", x: "#5a3820", y: "#8a5a32",
  // crate wood
  C: "#6b4a26", D: "#a07840", E: "#d2a45e",
  // ink red, glass, light
  R: "#d94a4a", G: "#9fd8e8", z: "#ffe9a0", w: "#ffffff", M: "#b0424c",
};
const COVER = ["a", "b", "c", "d"], SKIN = ["e", "f", "g", "h"], HAIR = ["i", "j", "l", "m"];
const HIVIS = ["n", "o", "p", "q"], STEEL = ["r", "s", "t", "u"], LEATHER = ["v", "x", "y"], WOOD = ["C", "D", "E"];
const W = 96, H = 96, CX = 48;

function bar(x0, y0, x1, y1, hw, ramp, bias = 0) {
  const L = new Layer(W, H);
  const dx = x1 - x0, dy = y1 - y0, n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n, nx = -uy, ny = ux;
  const P = (t, o) => [x0 + ux * t + nx * o, y0 + uy * t + ny * o];
  L.poly([P(0, -hw), P(n, -hw), P(n, hw), P(0, hw)], ramp, (x, y) => 0.5 + bias + ((x - x0) * nx + (y - y0) * ny) / -(hw * 2.4));
  return L;
}

/** Adjustable wrench held upright; its jaw is at the top. */
function wrench(x, y, tilt, glow) {
  const L = new Layer(W, H);
  const tx = x + tilt * 18, ty = y - 26;
  L.draw(bar(x, y + 6, tx, ty, 2, STEEL, 0.1));
  L.ellipse(tx, ty - 3, 6, 6, STEEL, { bias: glow ? 0.3 : 0.05 });
  L.poly([[tx - 2, ty - 10], [tx + 2, ty - 10], [tx + 2, ty - 3], [tx - 2, ty - 3]], "."); // jaw gap
  L.line(x, y + 6, tx, ty, "t");
  return L.outline("k");
}

/** The stamp: wooden handle, steel block. `drop` (0..1) brings it down onto the floor. */
function stamp(x, y, drop, hit) {
  const L = new Layer(W, H);
  const sy = y - 14 + drop * 10;
  L.draw(bar(x, sy, x, sy - 14, 2, WOOD, 0.1));
  L.ellipse(x, sy - 15, 4, 3, WOOD, { bias: 0.1 });
  L.poly([[x - 9, sy], [x + 9, sy], [x + 9, sy + 6], [x - 9, sy + 6]], STEEL, (px) => 0.7 - (px - x + 9) / 30);
  L.line(x - 9, sy + 6, x + 9, sy + 6, hit ? "R" : "r");
  return L.outline("k");
}

function crate(x, y, s, ghost) {
  const L = new Layer(W, H);
  L.poly([[x, y], [x + s, y], [x + s, y + s], [x, y + s]], WOOD, (px) => 0.7 - (px - x) / (s * 2.2));
  L.line(x, y, x + s, y + s, "C"); L.line(x + s, y, x, y + s, "C");
  L.outline("k");
  if (ghost) L.clip((px, py) => { if ((px + py) % 2) L.px[py][px] = "."; });
  return L;
}

function corvo({ dy = 0, breath = 0, wrenchTilt = 0, drop = 0, swing = 0, blink = false, mouth = "calm", lean = 0, squash = 0, brow = 0, kneel = 0, glow = false, hit = false, crates = 0 }) {
  const out = new Layer(W, H);
  const y0 = dy + kneel;
  const handL = [20 + lean, 66 + y0];
  out.draw(wrench(handL[0], handL[1] - 4, wrenchTilt, glow));

  const body = new Layer(W, H);
  body.ellipse(37, 90 - kneel * 0.3, 9, 4.5, LEATHER, { bias: 0.1 });
  body.ellipse(59, 90 - kneel * 0.3, 9, 4.5, LEATHER, { bias: -0.1 });
  // legs: two green trousers with hi-vis ankle bands
  const sh = 42 + y0 + breath + squash;
  body.poly([[30, sh + 18], [66, sh + 18], [64, 88], [32, 88]], COVER, (x) => 0.6 - (x - 30) / 80);
  body.line(CX, sh + 22, CX, 88, "a");
  body.poly([[32, 82 - kneel * 0.3], [64, 82 - kneel * 0.3], [64, 85 - kneel * 0.3], [32, 85 - kneel * 0.3]], HIVIS, (x) => 0.65 - (x - 32) / 90);
  // torso: broad bib-front coveralls
  body.poly([[26, sh], [70, sh], [66, sh + 26], [30, sh + 26]], COVER, (x, y) => 0.65 - (x - 26) / 90 - (y - sh) / 150);
  // hi-vis chest band
  body.poly([[28, sh + 9], [68, sh + 9], [68, sh + 13], [28, sh + 13]], HIVIS, (x) => 0.7 - (x - 28) / 90);
  // zip + breast pocket
  body.line(CX, sh + 2, CX, sh + 22, "a");
  body.poly([[34, sh + 15], [43, sh + 15], [43, sh + 22], [34, sh + 22]], COVER, () => 0.35);
  // tool belt
  body.poly([[28, sh + 24], [68, sh + 24], [67, sh + 29], [29, sh + 29]], LEATHER, (x) => 0.75 - (x - 28) / 90);
  body.poly([[CX - 3, sh + 24], [CX + 3, sh + 24], [CX + 3, sh + 29], [CX - 3, sh + 29]], STEEL, () => 0.8);
  for (const px of [34, 58, 62]) body.poly([[px, sh + 28], [px + 4, sh + 28], [px + 4, sh + 34], [px, sh + 34]], LEATHER, () => 0.4);
  // shoulders
  body.ellipse(28, sh + 3, 8, 6, COVER, { bias: 0.1 });
  body.ellipse(68, sh + 3, 8, 6, COVER, { bias: -0.25 });
  // neck and head (wide jaw)
  const hy = 27 + y0 + breath * 0.6;
  body.poly([[CX - 5, hy + 8], [CX + 5, hy + 8], [CX + 6, sh], [CX - 6, sh]], SKIN, () => 0.2);
  body.ellipse(CX, hy, 12, 12, SKIN, { bias: 0.05 });
  body.ellipse(CX, hy + 6, 10, 8, SKIN, { bias: 0.0 });
  // collar
  body.poly([[CX - 11, sh - 2], [CX + 11, sh - 2], [CX + 8, sh + 5], [CX - 8, sh + 5]], COVER, () => 0.75);
  body.outline("k");
  out.draw(body, lean, 0);

  // close grey crop with a hairline
  const hair = new Layer(W, H);
  hair.ellipse(CX, hy - 3, 12.5, 11, HAIR, { bias: 0 });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (hair.px[y][x] !== "." && y > hy - 5 && Math.abs(x - CX) < 10) hair.px[y][x] = ".";
  hair.clip((x, y) => { if ((x + y * 2) % 5 === 0) hair.px[y][x] = "i"; });
  out.draw(hair.outline("k"), lean, 0);

  // face: square glasses, thick brows, a pencil behind the ear
  const f = new Layer(W, H);
  const ey = hy - 1;
  for (const [ex, s] of [[CX - 5, -1], [CX + 5, 1]]) {
    f.poly([[ex - 4, ey - 3], [ex + 4, ey - 3], [ex + 4, ey + 3], [ex - 4, ey + 3]], ["G", "G", "w"], (x, y) => ((x + y) % 7 === 0 ? 0.9 : 0.3));
    if (blink) f.line(ex - 3, ey, ex + 3, ey, "k");
    else { f.set(ex, ey, "k"); f.set(ex + s, ey, "k"); f.set(ex, ey + 1, "k"); }
    f.line(ex - 4, ey - 3, ex + 4, ey - 3, "r"); f.line(ex - 4, ey + 3, ex + 4, ey + 3, "r");
    f.line(ex - 4, ey - 3, ex - 4, ey + 3, "r"); f.line(ex + 4, ey - 3, ex + 4, ey + 3, "r");
    f.line(ex - 5, ey - 6 - (s > 0 ? brow : 0), ex + 5, ey - 6 + (s > 0 ? 0 : brow), "i");
    f.line(ex - 5, ey - 5 - (s > 0 ? brow : 0), ex + 5, ey - 5 + (s > 0 ? 0 : brow), "i");
  }
  f.line(CX - 1, ey, CX + 1, ey, "r");
  f.set(CX, hy + 4, "f"); f.set(CX, hy + 5, "e");
  if (mouth === "open") f.ellipse(CX, hy + 9, 3.4, 2.6, ["k", "M", "R"], { bias: -0.1 });
  else if (mouth === "grim") f.line(CX - 3, hy + 9, CX + 3, hy + 9, "k");
  else { f.line(CX - 3, hy + 9, CX + 3, hy + 9, "M"); f.set(CX - 4, hy + 8, "M"); f.set(CX + 4, hy + 8, "M"); }
  // pencil behind the (viewer's right) ear
  f.line(CX + 12, hy - 2, CX + 14, hy - 9, "p"); f.set(CX + 12, hy - 1, "k"); f.set(CX + 14, hy - 10, "R");
  out.draw(f, lean, 0);

  // arms
  const arm = new Layer(W, H);
  arm.poly([[18, sh + 2], [34, sh + 2], [30, sh + 26], [16, sh + 26]], COVER, (x) => 0.5 - (x - 16) / 60);
  arm.poly([[15, sh + 18], [32, sh + 18], [31, sh + 22], [16, sh + 22]], HIVIS, () => 0.5);
  arm.ellipse(handL[0] + 1, handL[1], 5, 5, SKIN, { bias: 0.05 });
  const gx = 77 + swing + lean, gy = 62 + y0 + drop * 8;
  arm.poly([[62, sh + 2], [78, sh + 4], [80, sh + 24], [66, sh + 26]], COVER, () => 0.22);
  arm.poly([[64, sh + 20], [79, sh + 22], [80, sh + 25], [66, sh + 27]], HIVIS, () => 0.35);
  arm.ellipse(gx, gy, 5, 5, SKIN, { bias: -0.2 });
  out.draw(arm.outline("k"), lean, 0);
  out.draw(stamp(gx, gy - 2, drop, hit));
  // the stamped products
  for (let i = 0; i < crates; i++) out.draw(crate(52 + i * 11 - 6, 80, 9, i > 0 && crates < 3));
  return out;
}

function animSet() {
  const idle = [corvo({}), corvo({ breath: 1, swing: 1, wrenchTilt: 0.04 }), corvo({ breath: 1, swing: 2, blink: true, wrenchTilt: 0.06 }), corvo({ swing: 1, wrenchTilt: 0.02 })];
  const attack = [
    corvo({ brow: 1, mouth: "grim", lean: -2, swing: -3, wrenchTilt: -0.1 }),
    corvo({ brow: 1, mouth: "open", lean: -3, dy: -2, squash: -1, glow: true, swing: -4, drop: -0.6, wrenchTilt: -0.2 }),
    corvo({ brow: 1, mouth: "open", lean: 4, dy: 2, squash: 2, glow: true, drop: 1, hit: true, wrenchTilt: 0.25, crates: 1 }),
    corvo({ mouth: "grim", lean: 2, swing: 2, drop: 0.4, wrenchTilt: 0.1, crates: 3 }),
  ];
  const hurt = [corvo({ dy: 2, lean: 4, blink: true, mouth: "open", brow: 1, swing: 4, wrenchTilt: 0.3 }), corvo({ dy: 1, lean: 2, blink: true, mouth: "grim", brow: 1, swing: 2, wrenchTilt: -0.1 })];
  const faint = [
    corvo({ dy: 1, blink: true, mouth: "open", wrenchTilt: 0.35 }),
    dissolve(corvo({ dy: 2, blink: true, kneel: 6, wrenchTilt: 0.7, mouth: "grim" }), 0.15, 2),
    dissolve(corvo({ dy: 4, blink: true, kneel: 10, wrenchTilt: 1.1, mouth: "grim" }), 0.5, 6),
    dissolve(corvo({ dy: 4, blink: true, kneel: 12, wrenchTilt: 1.3 }), 0.9, 10),
  ];
  return { idle, attack, hurt, faint };
}

emit("game/sprites/creatures/foreman-corvo.ts", {
  id: "foreman-corvo", name: "FOREMAN CORVO", w: W, h: H, palette, fps: { idle: 3, attack: 8, hurt: 8, faint: 5 }, script: "corvo", anims: animSet(),
  comment: "Creational Foundry district master: a broad foreman in forest-green coveralls with a wrench, a rubber stamp that leaves identical crates, square glasses and a pencil behind the ear.",
});
