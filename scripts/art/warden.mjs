// WARDEN HOLLIS VANE, keeper of the Old Town Gate (96×96 master sprite).
// A broad, grey-bearded gatekeeper in a long slate coat and flat-topped cap.
// The staff ends in a big iron key ring (who owns what), a ring of keys hangs
// at the belt, and a lantern lights "the path an owner must clean up".
// Run: node scripts/art/warden.mjs   (ART_PREVIEW=<dir> writes a contact sheet)
import { Layer, dissolve, emit, ring } from "./paint.mjs";

const palette = {
  k: "#0a0e16",
  // slate coat
  a: "#1a2433", b: "#2c3e55", c: "#46628a", d: "#7a9cc4",
  // skin
  e: "#7a4a35", f: "#b87a58", g: "#e0a67e", h: "#f6cfa8",
  // beard / hair
  i: "#4a4f5c", j: "#8a90a0", l: "#c9cdd8", m: "#f0f2f7",
  // brass
  n: "#6b4a12", o: "#b8860b", p: "#e8b933", q: "#fff0a0",
  // leather / wood
  r: "#2b1810", s: "#4a2a1a", t: "#7a4a2a", u: "#a8703e",
  // scarf
  v: "#6e1f2a", x: "#b03a48", y: "#e56b78",
  // glass / light
  z: "#ffe9a0", w: "#ffffff", Z: "#8fd6ff",
};
const COAT = ["a", "b", "c", "d"], SKIN = ["e", "f", "g", "h"], BEARD = ["i", "j", "l", "m"];
const BRASS = ["n", "o", "p", "q"], WOOD = ["s", "t", "u"], SCARF = ["v", "x", "y"], LEATHER = ["r", "s", "t"];
const W = 96, H = 96, CX = 48;

/** A straight capsule bar from (x0,y0) to (x1,y1) with half-width hw. */
function bar(x0, y0, x1, y1, hw, ramp, bias = 0) {
  const L = new Layer(W, H);
  const dx = x1 - x0, dy = y1 - y0, n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n, nx = -uy, ny = ux;
  const P = (t, o) => [x0 + ux * t + nx * o, y0 + uy * t + ny * o];
  L.poly([P(0, -hw), P(n, -hw), P(n, hw), P(0, hw)], ramp, (x, y) => 0.5 + bias + ((x - x0) * nx + (y - y0) * ny) / -(hw * 2.4));
  return L;
}

function keyRing(cx, cy, r, keys) {
  const L = new Layer(W, H);
  for (let i = 0; i < keys; i++) {
    const a = (i / keys) * Math.PI * 1.1 + 0.35;
    const kx = cx + Math.cos(a) * (r + 1), ky = cy + Math.sin(a) * (r + 1);
    L.line(kx, ky, kx + Math.cos(a) * 6, ky + Math.sin(a) * 6, "p");
    L.set(kx + Math.cos(a) * 7, ky + Math.sin(a) * 7, "q");
    L.set(kx + Math.cos(a) * 6 + Math.sin(a), ky + Math.sin(a) * 6 - Math.cos(a), "o");
  }
  ring(L, cx, cy, r, r, "o", 2);
  ring(L, cx, cy, r, r, "q", 1);
  return L.outline("k");
}

function lantern(x, y, glow) {
  const L = new Layer(W, H);
  L.line(x, y - 9, x, y - 4, "n");
  L.poly([[x - 5, y - 4], [x + 5, y - 4], [x + 6, y], [x - 6, y]], BRASS, () => 0.5);
  L.poly([[x - 6, y], [x + 6, y], [x + 6, y + 11], [x - 6, y + 11]], glow ? ["p", "z", "w"] : ["o", "z", "z"], (px) => 0.55 + (px - x) / -20);
  L.line(x - 6, y, x - 6, y + 11, "n");
  L.line(x + 6, y, x + 6, y + 11, "n");
  L.line(x, y, x, y + 11, "n");
  L.poly([[x - 6, y + 11], [x + 6, y + 11], [x + 4, y + 14], [x - 4, y + 14]], BRASS, () => 0.3);
  return L.outline("k");
}

function warden({ dy = 0, breath = 0, staffTilt = 0, staffRaise = 0, swing = 0, blink = false, mouth = "calm", lean = 0, squash = 0, brow = 0, kneel = 0, glow = false }) {
  const out = new Layer(W, H);
  const y0 = dy + kneel;
  // ---- staff (viewer's left), behind the body ----
  const handL = [22 + lean, 56 + y0 - staffRaise];
  const topL = [20 + staffTilt * 22 + lean, 12 + y0 + staffTilt * 14 - staffRaise];
  const botL = [handL[0] - staffTilt * 4, 90];
  out.draw(bar(botL[0], botL[1], topL[0], topL[1], 2, WOOD, 0.1).outline("k"));
  out.draw(keyRing(topL[0], topL[1] - 5, 7, 5));

  const body = new Layer(W, H);
  // boots
  body.ellipse(38, 90 - kneel * 0.3, 8, 4, LEATHER, { bias: 0.1 });
  body.ellipse(58, 90 - kneel * 0.3, 8, 4, LEATHER, { bias: -0.1 });
  // long coat: shoulders to hem, flaring
  const sh = 40 + y0 + breath + squash, hem = 86 - kneel * 0.4;
  body.poly([[30, sh], [66, sh], [73, hem], [23, hem]], COAT, (x, y) => 0.62 - (x - 23) / 90 - (y - sh) / 160);
  // coat centre seam and brass buttons
  body.line(CX, sh + 2, CX, hem - 1, "a");
  for (let i = 0; i < 4; i++) { const by = sh + 6 + i * 9; body.set(CX - 2, by, "p"); body.set(CX - 2, by + 1, "o"); body.set(CX + 2, by, "p"); body.set(CX + 2, by + 1, "o"); }
  // belt and buckle
  const beltY = sh + 24;
  body.poly([[27, beltY], [69, beltY], [70, beltY + 4], [26, beltY + 4]], LEATHER, (x) => 0.7 - (x - 26) / 90);
  body.poly([[CX - 3, beltY - 1], [CX + 3, beltY - 1], [CX + 3, beltY + 5], [CX - 3, beltY + 5]], BRASS, () => 0.6);
  body.set(CX, beltY + 2, "k");
  // shoulders / epaulettes
  body.ellipse(30, sh + 2, 8, 6, COAT, { bias: 0.1 });
  body.ellipse(66, sh + 2, 8, 6, COAT, { bias: -0.25 });
  body.ellipse(26, sh + 1, 5, 3, BRASS, { bias: 0.1 });
  body.ellipse(70, sh + 1, 5, 3, BRASS, { bias: -0.2 });
  // scarf at the neck
  body.poly([[37, sh - 3], [59, sh - 3], [57, sh + 6], [39, sh + 6]], SCARF, (x, y) => 0.6 - (y - sh) / 14);
  body.poly([[52, sh + 4], [58, sh + 4], [60, sh + 18], [54, sh + 16]], SCARF, () => 0.3);
  // head
  const hy = 26 + y0 + breath * 0.6;
  body.ellipse(CX, hy, 11, 12, SKIN, { bias: 0.02 });
  body.outline("k");
  out.draw(body, lean, 0);

  // beard (over the lower face and chest)
  const beard = new Layer(W, H);
  beard.poly([[CX - 11, hy + 1], [CX + 11, hy + 1], [CX + 9, hy + 12], [CX + 3, hy + 22], [CX, hy + 25], [CX - 3, hy + 22], [CX - 9, hy + 12]], BEARD, (x, y) => 0.7 - (x - CX + 11) / 50 - (y - hy) / 90);
  // beard strands
  beard.clip((x, y) => { if ((x + y * 2) % 7 === 0 && y > hy + 8) beard.px[y][x] = "j"; });
  // moustache
  beard.ellipse(CX - 4, hy + 4, 5, 2.5, BEARD, { bias: 0.15 });
  beard.ellipse(CX + 4, hy + 4, 5, 2.5, BEARD, { bias: -0.05 });
  out.draw(beard.outline("k"), lean, 0);

  // face
  const f = new Layer(W, H);
  const ey = hy - 2;
  for (const [ex, s] of [[CX - 5, -1], [CX + 5, 1]]) {
    if (blink) f.line(ex - 2, ey + 1, ex + 2, ey + 1, "k");
    else { f.set(ex - 1, ey, "w"); f.set(ex, ey, "w"); f.set(ex + 1, ey, "w"); f.set(ex, ey + 1, "k"); f.set(ex + s, ey + 1, "k"); f.set(ex - s, ey + 1, "w"); f.set(ex, ey + 1, "k"); }
    // heavy brow
    f.line(ex - 3, ey - 2 - (s > 0 ? brow : 0), ex + 3, ey - 3 + (s > 0 ? 0 : brow) - (brow ? 1 : 0), "i");
    f.line(ex - 3, ey - 3 - (s > 0 ? brow : 0), ex + 3, ey - 4 + (s > 0 ? 0 : brow) - (brow ? 1 : 0), "l");
  }
  f.set(CX, hy + 1, "f"); f.set(CX, hy + 2, "e"); // nose
  if (mouth === "open") f.ellipse(CX, hy + 8, 3, 2.3, ["k", "x", "y"], { bias: -0.1 });
  else if (mouth === "grim") { f.line(CX - 2, hy + 8, CX + 2, hy + 8, "k"); }
  else { f.line(CX - 2, hy + 8, CX + 2, hy + 8, "i"); }
  out.draw(f, lean, 0);

  // cap: flat crown, brass badge
  const cap = new Layer(W, H);
  cap.ellipse(CX, hy - 11, 14, 7, COAT, { bias: 0.05 });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (y > hy - 10) cap.px[y][x] = ".";
  cap.poly([[CX - 15, hy - 11], [CX + 15, hy - 11], [CX + 18, hy - 8], [CX - 18, hy - 8]], COAT, (x) => 0.65 - (x - CX + 18) / 60);
  cap.poly([[CX - 14, hy - 14], [CX + 14, hy - 14], [CX + 14, hy - 11], [CX - 14, hy - 11]], SCARF, () => 0.45);
  cap.ellipse(CX, hy - 12, 3, 3, BRASS, { bias: 0.1 });
  cap.set(CX, hy - 12, "k");
  out.draw(cap.outline("k"), lean, 0);

  // ---- arms ----
  const arm = new Layer(W, H);
  // left sleeve gripping the staff
  arm.poly([[22, sh + 2], [34, sh + 2], [30, sh + 22 - staffRaise * 0.3], [20, sh + 22 - staffRaise * 0.3]], COAT, (x) => 0.5 - (x - 20) / 50);
  arm.ellipse(handL[0] + 1, handL[1], 4.5, 4.5, SKIN, { bias: 0.05 });
  // right sleeve holding the lantern
  const lx = 76 + swing + lean, ly = 62 + y0;
  arm.poly([[64, sh + 2], [76, sh + 4], [78, sh + 22], [68, sh + 24]], COAT, () => 0.22);
  arm.ellipse(77, sh + 24, 4.5, 4.5, SKIN, { bias: -0.2 });
  out.draw(arm.outline("k"), lean, 0);
  out.draw(lantern(lx, ly, glow));
  if (glow) for (const [dx, dy2] of [[-10, 2], [10, 8], [0, 18]]) out.set(lx + dx, ly + dy2, "z");

  // key ring at the belt (viewer's right hip)
  const kr = new Layer(W, H);
  const kx = 62 + lean + swing * 0.3, ky = beltY + 5 + y0 * 0;
  kr.line(kx, ky, kx + 2, ky + 9, "o"); kr.line(kx - 3, ky, kx - 4, ky + 8, "p"); kr.line(kx + 3, ky, kx + 5, ky + 7, "o");
  kr.set(kx + 2, ky + 10, "q"); kr.set(kx - 4, ky + 9, "q"); kr.set(kx + 5, ky + 8, "q");
  out.draw(kr.outline("k"));
  return out;
}

function animSet() {
  const idle = [warden({}), warden({ breath: 1, swing: 1, dy: 0 }), warden({ breath: 1, swing: 2, blink: true }), warden({ breath: 0, swing: 1 })];
  const attack = [
    warden({ staffRaise: 6, staffTilt: -0.15, brow: 1, mouth: "grim", lean: -2, swing: -2 }),
    warden({ staffRaise: 8, staffTilt: -0.3, brow: 1, mouth: "open", lean: -3, dy: -2, squash: -1, glow: true }),
    warden({ staffRaise: -4, staffTilt: 1.0, brow: 1, mouth: "open", lean: 4, dy: 2, squash: 2, glow: true }),
    warden({ staffRaise: 0, staffTilt: 0.5, mouth: "grim", lean: 2, swing: 2 }),
  ];
  const hurt = [warden({ dy: 2, lean: 4, blink: true, mouth: "open", brow: 1, swing: 4, staffTilt: 0.25 }), warden({ dy: 1, lean: 2, blink: true, mouth: "grim", brow: 1, swing: 2 })];
  const f0 = warden({ dy: 1, blink: true, mouth: "open", kneel: 0, staffTilt: 0.4 });
  const faint = [f0, dissolve(warden({ dy: 2, blink: true, kneel: 6, staffTilt: 0.9, mouth: "grim" }), 0.15, 2), dissolve(warden({ dy: 4, blink: true, kneel: 10, staffTilt: 1.4, mouth: "grim" }), 0.5, 6), dissolve(warden({ dy: 4, blink: true, kneel: 12, staffTilt: 1.6 }), 0.9, 10)];
  return { idle, attack, hurt, faint };
}

const fps = { idle: 3, attack: 8, hurt: 8, faint: 5 };
emit("game/sprites/creatures/warden-vane.ts", {
  id: "warden-vane", name: "WARDEN HOLLIS VANE", w: W, h: H, palette, fps, script: "warden", anims: animSet(),
  comment: "Old Town district master: a grey-bearded gatekeeper in a slate coat with a key-ring staff, a belt of keys and a lantern.",
});
