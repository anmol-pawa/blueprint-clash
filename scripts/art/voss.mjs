// DIRECTOR VOSS, master of the Behavioural Theatre (96x96 master sprite).
// A tall director in a plum velvet frock coat with gilt trim and a crimson cravat, swept-back grey hair,
// round glasses. One hand raises a gilt cue baton whose tip lights on attack (the cue everyone reacts to);
// the other holds a theatre mask that flips from comedy to tragedy (behaviour chosen at run time).
// Run: node scripts/art/voss.mjs   (ART_PREVIEW=<dir> writes a contact sheet)
import { Layer, dissolve, emit } from "./paint.mjs";

const palette = {
  k: "#0c0712",
  // plum coat
  a: "#2a1030", b: "#4a1f55", c: "#78358a", d: "#a864bd",
  // skin
  e: "#7a4a35", f: "#b07454", g: "#dca07a", h: "#f4cba5",
  // grey hair
  i: "#4a4a58", j: "#7c7e90", l: "#b4b7c6", m: "#eceef6",
  // gilt
  n: "#6e4a12", o: "#b07d1c", p: "#e0b038", q: "#fff0a8",
  // crimson cravat
  r: "#5a0f1c", s: "#9a1f33", t: "#d94a55", u: "#ff9a9a",
  // leather / boots
  v: "#241510", x: "#4e3220", y: "#7e5634",
  // mask porcelain
  C: "#8c8a96", D: "#cfcdd8", E: "#f5f4fa",
  // red, light
  R: "#d94a4a", z: "#ffe9a0", w: "#ffffff", M: "#b0424c", G: "#9fd8e8",
};
const COAT = ["a", "b", "c", "d"], SKIN = ["e", "f", "g", "h"], HAIR = ["j", "j", "l", "m"];
const BRASS = ["n", "o", "p", "q"], CRAV = ["r", "s", "t", "u"], LEATHER = ["v", "x", "y"], WOOD = ["C", "D", "E"];
const W = 96, H = 96, CX = 48;

function bar(x0, y0, x1, y1, hw, ramp, bias = 0) {
  const L = new Layer(W, H);
  const dx = x1 - x0, dy = y1 - y0, n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n, nx = -uy, ny = ux;
  const P = (t, o) => [x0 + ux * t + nx * o, y0 + uy * t + ny * o];
  L.poly([P(0, -hw), P(n, -hw), P(n, hw), P(0, hw)], ramp, (x, y) => 0.5 + bias + ((x - x0) * nx + (y - y0) * ny) / -(hw * 2.4));
  return L;
}

/** Gilt cue baton held upright; `glow` lights the tip. */
function lantern(x, y, glow, sway) {
  const L = new Layer(W, H);
  L.draw(bar(x, y + 8, x + sway, y - 26, 1.5, BRASS, 0.1));
  const tx = x + sway, ty = y - 29;
  L.ellipse(tx, ty, 3.5, 3.5, glow ? ["z", "q", "w"] : ["o", "p", "q"], { bias: 0.4 });
  if (glow) for (const [dx, dy] of [[-6, 0], [6, 0], [0, -6], [-4, -4], [4, -4]]) L.set(tx + dx, ty + dy, "q");
  return L.outline("k");
}

/** Theatre mask held at (x, y): `open` (0..1) turns the smile into a frown. */
function bridge(x, y, open, hit) {
  const L = new Layer(W, H);
  L.ellipse(x, y - 6, 7, 9, WOOD, { bias: 0.3 });
  L.set(x - 3, y - 8, "k"); L.set(x - 2, y - 8, "k"); L.set(x + 2, y - 8, "k"); L.set(x + 3, y - 8, "k");
  const up = open < 0.5;
  for (let i = -3; i <= 3; i++) L.set(x + i, y - 2 + (up ? Math.round((i * i) / 4) * -1 + 2 : Math.round((i * i) / 4) - 1), hit ? "R" : "M");
  L.line(x - 7, y - 6, x - 9, y - 6, "p"); L.line(x + 7, y - 6, x + 9, y - 6, "p");
  return L.outline("k");
}

function voss({ dy = 0, breath = 0, lift = 0, sway = 0, open = 0, blink = false, mouth = "calm", lean = 0, squash = 0, brow = 0, kneel = 0, glow = false, hit = false }) {
  const out = new Layer(W, H);
  const y0 = dy + kneel;
  const handL = [20 + lean, 64 + y0 - lift];
  out.draw(lantern(handL[0], handL[1], glow, sway));

  const body = new Layer(W, H);
  body.ellipse(38, 91 - kneel * 0.3, 9, 4, LEATHER, { bias: 0.1 });
  body.ellipse(58, 91 - kneel * 0.3, 9, 4, LEATHER, { bias: -0.1 });
  const sh = 42 + y0 + breath + squash;
  // long coat: shoulders to near the boots, flaring
  body.poly([[28, sh], [68, sh], [74, 88 - kneel * 0.3], [22, 88 - kneel * 0.3]], COAT, (x, y) => 0.7 - (x - 22) / 85 - (y - sh) / 190);
  body.line(CX, sh + 10, CX - 1, 88 - kneel * 0.3, "a"); // centre seam
  body.poly([[22, 83 - kneel * 0.3], [74, 83 - kneel * 0.3], [74, 85 - kneel * 0.3], [22, 85 - kneel * 0.3]], BRASS, (x) => 0.7 - (x - 22) / 90); // hem trim
  // double row of brass buttons
  for (let b = 0; b < 4; b++) for (const bx of [CX - 6, CX + 6]) body.set(bx, sh + 6 + b * 7, b % 2 ? "p" : "q");
  // lapels
  body.poly([[CX - 11, sh], [CX - 2, sh + 22], [CX - 12, sh + 22]], COAT, () => 0.82);
  body.poly([[CX + 11, sh], [CX + 2, sh + 22], [CX + 12, sh + 22]], COAT, () => 0.4);
  // teal sash across the waist with a brass buckle
  body.poly([[26, sh + 24], [70, sh + 24], [70, sh + 30], [26, sh + 30]], CRAV, (x) => 0.75 - (x - 26) / 80);
  body.poly([[CX - 3, sh + 24], [CX + 3, sh + 24], [CX + 3, sh + 30], [CX - 3, sh + 30]], BRASS, () => 0.75);
  // shoulders (epaulettes)
  body.ellipse(28, sh + 3, 8, 6, COAT, { bias: 0.1 });
  body.ellipse(68, sh + 3, 8, 6, COAT, { bias: -0.25 });
  body.poly([[22, sh], [34, sh], [34, sh + 3], [22, sh + 3]], BRASS, () => 0.6);
  body.poly([[62, sh], [74, sh], [74, sh + 3], [62, sh + 3]], BRASS, () => 0.35);
  // neck and head (oval, longer jaw)
  const hy = 27 + y0 + breath * 0.6;
  body.poly([[CX - 4, hy + 8], [CX + 4, hy + 8], [CX + 5, sh], [CX - 5, sh]], SKIN, () => 0.2);
  body.ellipse(CX, hy, 10, 12, SKIN, { bias: 0.05 });
  body.ellipse(CX, hy + 6, 8, 7, SKIN, { bias: 0.0 });
  // high collar
  body.poly([[CX - 10, sh - 3], [CX + 10, sh - 3], [CX + 8, sh + 4], [CX - 8, sh + 4]], COAT, () => 0.8);
  body.outline("k");
  out.draw(body, lean, 0);

  // hair: pulled up, silver streaks, with a braid-bun on top
  const hair = new Layer(W, H);
  hair.ellipse(CX, hy - 4, 11, 10, HAIR, { bias: 0 });
  hair.ellipse(CX + 2, hy - 11, 9, 4, HAIR, { bias: 0.4 }); // swept-back quiff
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (hair.px[y][x] !== "." && y > hy - 6 && Math.abs(x - CX) < 9 && y > hy - 6 + Math.abs(x - CX) * 0.2) hair.px[y][x] = ".";
  hair.clip((x, y) => { if ((x * 2 + y) % 6 === 0 && hair.px[y][x] !== ".") hair.px[y][x] = "m"; });
  out.draw(hair.outline("k"), lean, 0);

  // face: calm eyes, level brows, no glasses
  const f = new Layer(W, H);
  const ey = hy - 1;
  for (const [ex, s] of [[CX - 4, -1], [CX + 4, 1]]) {
    f.line(ex - 2, ey - 1, ex + 2, ey - 1, "w"); f.line(ex - 2, ey, ex + 2, ey, "w");
    if (blink) f.line(ex - 2, ey, ex + 2, ey, "k");
    else { f.set(ex, ey, "k"); f.set(ex, ey - 1, "k"); f.set(ex + s, ey, "c"); }
    f.line(ex - 3, ey - 4 - (s > 0 ? brow : 0), ex + 3, ey - 4 + (s > 0 ? 0 : brow), "i");
  }
  for (const ex of [CX - 4, CX + 4]) { f.ellipse(ex, ey - 0.5, 4, 3.2, ["p", "p", "q"], { bias: 0 }); f.line(ex - 1, ey - 1, ex + 1, ey - 1, "w"); f.set(ex, ey - 1, "k"); f.set(ex, ey, "k"); }
  f.line(CX - 1, ey - 1, CX + 1, ey - 1, "p");
  f.set(CX, hy + 3, "f"); f.set(CX, hy + 4, "e");
  if (mouth === "open") f.ellipse(CX, hy + 8, 2.8, 2.4, ["k", "M", "R"], { bias: -0.1 });
  else if (mouth === "grim") f.line(CX - 2, hy + 8, CX + 2, hy + 8, "k");
  else { f.line(CX - 2, hy + 8, CX + 2, hy + 8, "M"); f.set(CX - 3, hy + 7, "M"); f.set(CX + 3, hy + 7, "M"); }
  out.draw(f, lean, 0);

  // arms
  const arm = new Layer(W, H);
  arm.poly([[18, sh + 2], [34, sh + 2], [30, sh + 26], [16, sh + 26]], COAT, (x) => 0.5 - (x - 16) / 60);
  arm.poly([[16, sh + 22], [31, sh + 22], [30, sh + 26], [16, sh + 26]], BRASS, () => 0.5); // cuff
  arm.ellipse(handL[0] + 1, handL[1] + 2, 4.5, 4.5, SKIN, { bias: 0.05 });
  const gx = 76 + lean, gy = 63 + y0 - open * 4;
  arm.poly([[62, sh + 2], [78, sh + 4], [80, sh + 24], [66, sh + 26]], COAT, () => 0.22);
  arm.poly([[64, sh + 22], [79, sh + 23], [80, sh + 26], [66, sh + 27]], BRASS, () => 0.35);
  arm.ellipse(gx, gy, 4.5, 4.5, SKIN, { bias: -0.2 });
  out.draw(arm.outline("k"), lean, 0);
  out.draw(bridge(gx - 2, gy - 6, open, hit));
  return out;
}

function animSet() {
  const idle = [voss({}), voss({ breath: 1, sway: 1 }), voss({ breath: 1, sway: 2, blink: true }), voss({ sway: 1 })];
  const attack = [
    voss({ brow: 1, mouth: "grim", lean: -2, lift: 2, open: 0.2 }),
    voss({ brow: 1, mouth: "open", lean: -3, dy: -2, squash: -1, glow: true, lift: 5, open: 0.6 }),
    voss({ brow: 1, mouth: "open", lean: 4, dy: 2, squash: 2, glow: true, open: 1, hit: true, sway: 2 }),
    voss({ mouth: "grim", lean: 2, open: 0.8, sway: 1 }),
  ];
  const hurt = [voss({ dy: 2, lean: 4, blink: true, mouth: "open", brow: 1, sway: 3 }), voss({ dy: 1, lean: 2, blink: true, mouth: "grim", brow: 1, sway: -1 })];
  const faint = [
    voss({ dy: 1, blink: true, mouth: "open", sway: 3 }),
    dissolve(voss({ dy: 2, blink: true, kneel: 6, mouth: "grim", sway: 4 }), 0.15, 2),
    dissolve(voss({ dy: 4, blink: true, kneel: 10, mouth: "grim", sway: 5 }), 0.5, 6),
    dissolve(voss({ dy: 4, blink: true, kneel: 12, sway: 5 }), 0.9, 10),
  ];
  return { idle, attack, hurt, faint };
}

emit("game/sprites/creatures/director-voss.ts", {
  id: "director-voss", name: "DIRECTOR VOSS", w: W, h: H, palette, fps: { idle: 3, attack: 8, hurt: 8, faint: 5 }, script: "voss", anims: animSet(),
  comment: "Behavioural Theatre district master: a tall director in a plum velvet frock coat with a crimson cravat, a gilt cue baton in one hand and a theatre mask that flips from comedy to tragedy in the other.",
});
