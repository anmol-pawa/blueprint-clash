// PROVOST ISOLDE MARLOW, keeper of the Principle Hall (96×96 master sprite).
// A tall judge in an burgundy robe with a white fluted ruff and a silver
// twist of hair under a flat black cap. Her staff carries a balance whose five
// gems are the five SOLID principles (one gem per pan side, S O L I D); the
// other hand holds a gavel that falls on every design that breaks a contract.
// Run: node scripts/art/provost.mjs   (ART_PREVIEW=<dir> writes a contact sheet)
import { Layer, dissolve, emit, ring } from "./paint.mjs";

const palette = {
  k: "#0c0a14",
  // burgundy robe
  a: "#2e0f1a", b: "#5a1a2c", c: "#8c2c44", d: "#c8607a",
  // skin
  e: "#7a4a35", f: "#b07454", g: "#dca07a", h: "#f4cba5",
  // silver hair
  i: "#555a6b", j: "#939aab", l: "#cdd2de", m: "#f2f4f9",
  // gold
  n: "#6b4a12", o: "#b8860b", p: "#e8b933", q: "#fff0a0",
  // wood
  r: "#2b1810", s: "#4a2a1a", t: "#7a4a2a", u: "#a8703e",
  // ruff / lace
  v: "#8e97b5", x: "#d4daee", y: "#ffffff",
  // principle gems
  R: "#e0505a", G: "#4fc46a", B: "#4a7ae0", Z: "#8fd6ff",
  // light, lips
  z: "#ffe9a0", w: "#ffffff", M: "#b0424c",
};
const ROBE = ["a", "b", "c", "d"], SKIN = ["e", "f", "g", "h"], HAIR = ["i", "j", "l", "m"];
const GOLD = ["n", "o", "p", "q"], WOOD = ["s", "t", "u"], RUFF = ["v", "x", "y"], LEATHER = ["r", "s", "t"];
const W = 96, H = 96, CX = 48;

function bar(x0, y0, x1, y1, hw, ramp, bias = 0) {
  const L = new Layer(W, H);
  const dx = x1 - x0, dy = y1 - y0, n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n, nx = -uy, ny = ux;
  const P = (t, o) => [x0 + ux * t + nx * o, y0 + uy * t + ny * o];
  L.poly([P(0, -hw), P(n, -hw), P(n, hw), P(0, hw)], ramp, (x, y) => 0.5 + bias + ((x - x0) * nx + (y - y0) * ny) / -(hw * 2.4));
  return L;
}

/** The balance on top of the staff. tilt > 0 drops the right pan. Five gems sit in the pans. */
function scales(cx, cy, tilt, glow) {
  const L = new Layer(W, H);
  const lx = cx - 12, rx = cx + 12, ly = cy - tilt, ry = cy + tilt;
  L.line(lx, ly, rx, ry, "p"); L.line(lx, ly + 1, rx, ry + 1, "o");
  L.ellipse(cx, cy, 3, 3, GOLD, { bias: 0.1 });
  for (const [px, py, gems] of [[lx, ly, ["R", "p", "G"]], [rx, ry, ["B", "Z"]]]) {
    L.line(px, py, px - 5, py + 11, "o"); L.line(px, py, px + 5, py + 11, "o");
    L.poly([[px - 7, py + 11], [px + 7, py + 11], [px + 5, py + 14], [px - 5, py + 14]], GOLD, () => 0.45);
    gems.forEach((g, i) => { const gx = px + (i - (gems.length - 1) / 2) * 4.2; L.ellipse(gx, py + 9, 2, 2, [g, g, glow ? "w" : g], { bias: 0.1 }); });
  }
  return L.outline("k");
}

function gavel(x, y, ang, strike) {
  const L = new Layer(W, H);
  const ex = x + Math.sin(ang) * 15, ey = y - Math.cos(ang) * 15;
  L.draw(bar(x, y, ex, ey, 1.4, WOOD, 0.1));
  const ux = Math.sin(ang) * 3.5, uy = -Math.cos(ang) * 3.5, px = Math.cos(ang) * 7, py = Math.sin(ang) * 7;
  L.poly([[ex - px - ux, ey - py - uy], [ex + px - ux, ey + py - uy], [ex + px + ux, ey + py + uy], [ex - px + ux, ey - py + uy]], GOLD, (x) => 0.6 - (x - ex) / 18);
  if (strike) for (const [dx, dy] of [[-5, 6], [0, 8], [5, 6]]) L.set(ex + dx, ey + dy, "q");
  return L.outline("k");
}

function provost({ dy = 0, breath = 0, staffTilt = 0, staffRaise = 0, swing = 0, blink = false, mouth = "calm", lean = 0, squash = 0, brow = 0, kneel = 0, glow = false, beam = 0, gavelAng = 0.5, strike = false }) {
  const out = new Layer(W, H);
  const y0 = dy + kneel;
  // ---- staff with the balance (viewer's left), behind the body ----
  const handL = [21 + lean, 58 + y0 - staffRaise];
  const topL = [20 + staffTilt * 22 + lean, 18 + y0 + staffTilt * 14 - staffRaise];
  const botL = [handL[0] - staffTilt * 4, 90];
  out.draw(bar(botL[0], botL[1], topL[0], topL[1], 1.8, WOOD, 0.1).outline("k"));
  out.draw(scales(topL[0], topL[1] - 3, beam, glow));

  const body = new Layer(W, H);
  body.ellipse(39, 90 - kneel * 0.3, 8, 4, LEATHER, { bias: 0.1 });
  body.ellipse(57, 90 - kneel * 0.3, 8, 4, LEATHER, { bias: -0.1 });
  // long robe, A-line to the floor
  const sh = 41 + y0 + breath + squash, hem = 87 - kneel * 0.4;
  body.poly([[31, sh], [65, sh], [72, hem], [24, hem]], ROBE, (x, y) => 0.62 - (x - 24) / 90 - (y - sh) / 170);
  // front panel with gold trim and five gold studs (one per principle)
  body.poly([[CX - 5, sh + 3], [CX + 5, sh + 3], [CX + 7, hem - 1], [CX - 7, hem - 1]], ROBE, (x) => 0.78 - (x - CX + 7) / 40);
  body.line(CX - 5, sh + 3, CX - 7, hem - 1, "p"); body.line(CX + 5, sh + 3, CX + 7, hem - 1, "o");
  for (let i = 0; i < 5; i++) { const by = sh + 8 + i * 8; body.set(CX, by, "q"); body.set(CX, by + 1, "p"); }
  // sash
  const beltY = sh + 22;
  body.poly([[28, beltY], [68, beltY], [69, beltY + 4], [27, beltY + 4]], GOLD, (x) => 0.7 - (x - 27) / 90);
  // shoulders
  body.ellipse(31, sh + 2, 8, 6, ROBE, { bias: 0.1 });
  body.ellipse(65, sh + 2, 8, 6, ROBE, { bias: -0.25 });
  // head
  const hy = 27 + y0 + breath * 0.6;
  body.poly([[CX - 3, hy + 8], [CX + 3, hy + 8], [CX + 4, sh], [CX - 4, sh]], SKIN, () => 0.2); // neck
  body.ellipse(CX, hy, 10, 12, SKIN, { bias: 0.05 });
  body.outline("k");
  out.draw(body, lean, 0);

  // ruff: a fluted white collar around the neck
  const ruff = new Layer(W, H);
  ruff.poly([[CX - 15, sh - 2], [CX + 15, sh - 2], [CX + 12, sh + 7], [CX - 12, sh + 7]], RUFF, (x, y) => 0.7 - (y - sh) / 14);
  for (let x = CX - 14; x <= CX + 14; x += 3) { ruff.line(x, sh - 2, x - 1, sh + 6, "v"); }
  ruff.set(CX, sh + 7, "v");
  out.draw(ruff.outline("k"), lean, 0);

  // hair: silver, swept back, a tall twist on top
  const hair = new Layer(W, H);
  hair.ellipse(CX, hy - 16, 6, 5, HAIR, { bias: 0.1 }); // twist
  hair.ellipse(CX, hy - 4, 11.5, 10, HAIR, { bias: 0 });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (hair.px[y][x] !== "." && y > hy - 3 && Math.abs(x - CX) < 9) hair.px[y][x] = ".";
  hair.clip((x, y) => { if ((x * 2 + y) % 6 === 0 && hair.px[y][x] !== ".") hair.px[y][x] = "i"; });
  out.draw(hair.outline("k"), lean, 0);

  // face
  const f = new Layer(W, H);
  const ey = hy - 1;
  for (const [ex, s] of [[CX - 5, -1], [CX + 5, 1]]) {
    if (blink) f.line(ex - 2, ey + 1, ex + 2, ey + 1, "k");
    else { f.set(ex - 1, ey, "w"); f.set(ex, ey, "w"); f.set(ex + 1, ey, "w"); f.set(ex, ey + 1, "k"); f.set(ex + s, ey + 1, "k"); f.set(ex - s, ey + 1, "w"); }
    f.line(ex - 3, ey - 3 - (s > 0 ? brow : 0), ex + 3, ey - 4 + (s > 0 ? 0 : brow), "i");
    ring(f, ex, ey + 1, 4.4, 4.4, "p", 1); // round spectacles
  }
  f.line(CX - 1, ey + 1, CX + 1, ey + 1, "p");
  f.set(CX, hy + 3, "f"); f.set(CX, hy + 4, "e");
  if (mouth === "open") f.ellipse(CX, hy + 8, 2.8, 2.2, ["k", "M", "R"], { bias: -0.1 });
  else if (mouth === "grim") f.line(CX - 2, hy + 8, CX + 2, hy + 8, "k");
  else { f.line(CX - 2, hy + 8, CX + 2, hy + 8, "M"); f.set(CX - 3, hy + 7, "M"); f.set(CX + 3, hy + 7, "M"); }
  out.draw(f, lean, 0);

  // flat black judge's cap perched to the side of the twist
  const cap = new Layer(W, H);
  cap.poly([[CX - 13, hy - 13], [CX + 13, hy - 13], [CX + 14, hy - 10], [CX - 14, hy - 10]], ROBE, (x) => 0.4 - (x - CX + 13) / 90);
  cap.poly([[CX - 11, hy - 15], [CX + 11, hy - 15], [CX + 13, hy - 13], [CX - 13, hy - 13]], ["a", "b"], () => 0.3);
  cap.line(CX - 13, hy - 10, CX + 14, hy - 10, "p");
  out.draw(cap.outline("k"), lean, 0);

  // ---- arms ----
  const arm = new Layer(W, H);
  arm.poly([[22, sh + 2], [35, sh + 2], [31, sh + 24 - staffRaise * 0.3], [20, sh + 24 - staffRaise * 0.3]], ROBE, (x) => 0.5 - (x - 20) / 50);
  arm.poly([[18, sh + 20 - staffRaise * 0.3], [33, sh + 20 - staffRaise * 0.3], [33, sh + 24 - staffRaise * 0.3], [18, sh + 24 - staffRaise * 0.3]], GOLD, () => 0.5);
  arm.ellipse(handL[0] + 1, handL[1], 4.2, 4.2, SKIN, { bias: 0.05 });
  const gx = 76 + swing + lean, gy = 66 + y0;
  arm.poly([[64, sh + 2], [77, sh + 4], [79, sh + 22], [69, sh + 24]], ROBE, () => 0.22);
  arm.ellipse(gx, gy, 4.2, 4.2, SKIN, { bias: -0.2 });
  out.draw(arm.outline("k"), lean, 0);
  out.draw(gavel(gx, gy - 2, gavelAng, strike));
  return out;
}

function animSet() {
  const idle = [provost({ beam: 1 }), provost({ breath: 1, swing: 1, beam: 0 }), provost({ breath: 1, swing: 2, blink: true, beam: -1 }), provost({ breath: 0, swing: 1, beam: 0 })];
  const attack = [
    provost({ staffRaise: 4, staffTilt: -0.12, brow: 1, mouth: "grim", lean: -2, swing: -2, gavelAng: -0.3, beam: -3 }),
    provost({ staffRaise: 7, staffTilt: -0.25, brow: 1, mouth: "open", lean: -3, dy: -2, squash: -1, glow: true, gavelAng: -0.9, beam: -5 }),
    provost({ staffRaise: -2, staffTilt: 0.6, brow: 1, mouth: "open", lean: 4, dy: 2, squash: 2, glow: true, gavelAng: 1.05, strike: true, beam: 5 }),
    provost({ staffRaise: 0, staffTilt: 0.3, mouth: "grim", lean: 2, swing: 2, gavelAng: 0.9, beam: 2 }),
  ];
  const hurt = [provost({ dy: 2, lean: 4, blink: true, mouth: "open", brow: 1, swing: 4, staffTilt: 0.2, beam: 4 }), provost({ dy: 1, lean: 2, blink: true, mouth: "grim", brow: 1, swing: 2, beam: -2 })];
  const faint = [
    provost({ dy: 1, blink: true, mouth: "open", staffTilt: 0.4, beam: 4 }),
    dissolve(provost({ dy: 2, blink: true, kneel: 6, staffTilt: 0.9, mouth: "grim", beam: 6 }), 0.15, 2),
    dissolve(provost({ dy: 4, blink: true, kneel: 10, staffTilt: 1.4, mouth: "grim", beam: 7 }), 0.5, 6),
    dissolve(provost({ dy: 4, blink: true, kneel: 12, staffTilt: 1.6, beam: 8 }), 0.9, 10),
  ];
  return { idle, attack, hurt, faint };
}

emit("game/sprites/creatures/provost-marlow.ts", {
  id: "provost-marlow", name: "PROVOST ISOLDE MARLOW", w: W, h: H, palette, fps: { idle: 3, attack: 8, hurt: 8, faint: 5 }, script: "provost", anims: animSet(),
  comment: "SOLID Square district master: a silver-haired judge in an burgundy robe with a white ruff, a five-gem balance staff and a gavel.",
});
