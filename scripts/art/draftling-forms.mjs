// DRAFTLING (back view) and ARCHITECT, its evolution (front + back).
// The Architect swaps the pencil for a bigger one, wears a hard hat over its
// set-square ears, perches the compass on top and carries a rolled blueprint
// on a strap. Draftling palette is reused so the two read as one line.
// Run: node scripts/art/draftling-forms.mjs   (ART_PREVIEW=<dir> writes contact sheets)
import { Layer, dissolve, emit, ring, scaleLayer, sparkle, whiten } from "./paint.mjs";

const palette = {
  k: "#0b1b33", d: "#1c3f7a", c: "#2f66b8", b: "#4f95e0", a: "#a4d4ff",
  p: "#b79e62", q: "#efe3b8", r: "#fff8dc",
  t: "#b5650f", u: "#f0b429", v: "#ffe27a",
  s: "#1f8f8a", x: "#4cc9bd", z: "#b6fff0",
  g: "#343a46", h: "#8a93a3", m: "#c4506a", n: "#ff9fb0", w: "#ffffff", e: "#7be0ff",
};
const BODY = ["d", "c", "b", "a"];
const PAPER = ["p", "q", "r"];
const WOOD = ["t", "u", "v"];
const SQ = ["s", "x", "z"];

/** Pencil tail rooted at (bx, by), `len` long, angle in degrees from +x. */
function pencil(W, H, bx, by, len, deg) {
  const L = new Layer(W, H);
  const a = deg * (Math.PI / 180);
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const P = (t, o) => [bx + ux * t + nx * o, by + uy * t + ny * o];
  const hw = len > 20 ? 3.5 : 3;
  const sh = (x, y) => 0.5 + ((x - bx) * nx + (y - by) * ny) / -(hw * 2.6);
  L.poly([P(0, -hw), P(len, -hw), P(len, hw), P(0, hw)], WOOD, sh);
  L.poly([P(0, -hw), P(3, -hw), P(3, hw), P(0, hw)], ["g", "h"], sh);
  L.poly([P(-3, -hw), P(0, -hw), P(0, hw), P(-3, hw)], ["m", "n"], sh);
  L.poly([P(len, -hw), P(len + 5, -1), P(len + 5, 1), P(len, hw)], ["q", "r"], () => 0.4);
  L.poly([P(len + 5, -1), P(len + 8, 0), P(len + 5, 1)], "g");
  return L.outline("k");
}

/** Set-square ear on side s, centred on column cx. */
function ear(W, H, cx, s, baseY, top, reach, tilt, tickStep = 2.5) {
  const L = new Layer(W, H);
  const X = (x) => cx + s * x;
  L.poly([[X(reach[0]), baseY], [X(reach[0]), top], [X(reach[1]), baseY + tilt * 0.5]], SQ, (x, y) => 0.85 - (y - top) / 28 - (s > 0 ? 0.2 : 0));
  for (let y = top + 8; y < baseY - 1; y++) for (let x = 0; x < W; x++) if (Math.abs(x - X(reach[0] + 3.5)) < Math.max(0, (y - top - 8) * 0.32)) L.px[y][x] = ".";
  L.outline("k");
  for (let i = 1; i < 4; i++) L.set(X(reach[0] + i * tickStep), baseY + tilt * 0.5 - i * 3.5, "z");
  return L;
}

function compass(W, H, x, y, spread, hinge = true) {
  const c = new Layer(W, H);
  c.line(x, y, x - spread, y + spread * 1.7, "h");
  c.line(x, y, x + spread, y + spread * 1.7, "g");
  c.set(x - spread, y + spread * 1.7 + 1, "g");
  if (hinge) { c.set(x, y - 1, "v"); c.set(x, y, "u"); c.set(x - 1, y, "t"); c.set(x + 1, y, "t"); }
  return c.outline("k");
}

/** Rolled blueprint: a paper tube from (x0,y0) to (x1,y1), end cap at the top end. */
function scroll(W, H, x0, y0, x1, y1, hw = 3.6) {
  const L = new Layer(W, H);
  const dx = x1 - x0, dy = y1 - y0, n = Math.hypot(dx, dy);
  const ux = dx / n, uy = dy / n, nx = -uy, ny = ux;
  L.poly([[x0 + nx * hw, y0 + ny * hw], [x1 + nx * hw, y1 + ny * hw], [x1 - nx * hw, y1 - ny * hw], [x0 - nx * hw, y0 - ny * hw]], PAPER, (x, y) => 0.55 + ((x - x0) * nx + (y - y0) * ny) / -(hw * 2.2));
  L.clip((x, y) => { const t = (x - x0) * ux + (y - y0) * uy; if (Math.round(t) % 6 === 3) L.px[y][x] = "e"; });
  L.ellipse(x1, y1, hw, hw * 0.55, ["h", "q", "r"], { bias: 0.1 });
  L.set(x1, y1, "k");
  return L.outline("k");
}

const GRID = (L, x0, x1, y0, y1) =>
  L.clip((x, y) => { if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && (x % 6 === 0 || y % 6 === 0) && (x + y) % 2 === 0 && L.px[y][x] !== "k") L.px[y][x] = "e"; });

/* ---------------- Draftling, back view (64×64) ---------------- */
function draftlingBack({ dy = 0, tail = 0, arms = 0, lean = 0, squash = 0, ear: ea = 0, flinch = false }) {
  const W = 64, H = 64;
  const out = new Layer(W, H);
  const body = new Layer(W, H);
  const by = 44 + dy + squash;
  body.ellipse(24, 57 + dy * 0.2, 6, 3, BODY, { bias: -0.3 });
  body.ellipse(40, 57 + dy * 0.2, 6, 3, BODY, { bias: -0.3 });
  const ay = 45 + dy - arms * 10;
  body.ellipse(17, ay, 4, 5 - arms, BODY, { bias: -0.05 });
  body.ellipse(47, ay, 4, 5 - arms, BODY, { bias: -0.25 });
  body.ellipse(32, by, 13, 12 - squash * 0.5, BODY, { bias: -0.15 });
  GRID(body, 22, 42, by - 9, by + 10);
  body.ellipse(32, 27 + dy, 15, 12.5, BODY, { bias: -0.1 });
  // back-of-head: a drafting-paper crease where the face would be
  body.line(32, 17 + dy, 32, 36 + dy, "c");
  body.outline("k");
  out.draw(body, lean, 0);
  out.draw(ear(W, H, 32, -1, 21 + dy, 5 + dy + ea, [15, 27], ea), lean, 0);
  out.draw(ear(W, H, 32, 1, 21 + dy, 5 + dy + ea, [15, 27], ea), lean, 0);
  out.draw(compass(W, H, 32, 9 + dy, 4), lean, 0);
  if (flinch) out.draw(pencil(W, H, 38, 56 + dy, 17, -45 + tail), lean, 0);
  else out.draw(pencil(W, H, 38, 56 + dy, 17, -30 + tail), lean, 0);
  return out;
}

/* ---------------- Architect (80×80), front and back ---------------- */
function architect({ back = false, dy = 0, tail = 0, blink = false, mouth = "smile", arms = 0, lean = 0, squash = 0, ear: ea = 0 }) {
  const W = 80, H = 80;
  const out = new Layer(W, H);
  const CX = 40;

  // rolled blueprint behind the right shoulder (peeks over it)
  out.draw(scroll(W, H, 54, 56 + dy, 63, 38 + dy), lean, 0);
  out.draw(pencil(W, H, back ? 48 : 52, back ? 68 + dy : 66 + dy, 23, (back ? -35 : -46) + tail), lean, 0);

  const body = new Layer(W, H);
  const by = 57 + dy + squash;
  body.ellipse(29, 74 + dy * 0.2, 7, 3, BODY, { bias: -0.2 });
  body.ellipse(51, 74 + dy * 0.2, 7, 3, BODY, { bias: -0.3 });
  const ay = 58 + dy - arms * 13;
  body.ellipse(21, ay, 5, 6.5 - arms, BODY, { bias: back ? -0.05 : 0 });
  body.ellipse(59, ay, 5, 6.5 - arms, BODY, { bias: -0.25 });
  body.ellipse(CX, by, 17, 15 - squash * 0.5, BODY, { bias: back ? -0.15 : -0.05 });
  if (!back) {
    body.ellipse(CX, by + 2, 11, 11 - squash * 0.4, PAPER, { bias: 0.05 });
    for (let i = 0; i < 6; i++) {
      const y = Math.round(by - 5 + i * 3);
      for (let k = 0; k < (i % 2 === 0 ? 5 : 3); k++) body.set(31 + k, y, "p");
    }
  } else GRID(body, 25, 55, by - 12, by + 14);
  // strap across the chest/back
  const A = [27, by - 11], B = [55, by + 15];
  const ln = Math.hypot(B[0] - A[0], B[1] - A[1]);
  body.clip((x, y) => {
    if (x < 26 || x > 56 || y < by - 12 || y > by + 16) return;
    const d = Math.abs((B[0] - A[0]) * (A[1] - y) - (A[0] - x) * (B[1] - A[1])) / ln;
    if (d < 1.4) body.px[y][x] = "g";
    else if (d < 2.3) body.px[y][x] = "h";
  });
  body.set(CX, by + 2, "v"); body.set(CX + 1, by + 2, "u"); body.set(CX, by + 3, "u"); body.set(CX + 1, by + 3, "t");
  // head
  body.ellipse(CX, 33 + dy, 18, 15, BODY, { bias: back ? -0.1 : 0 });
  if (back) body.line(CX, 22 + dy, CX, 44 + dy, "c");
  body.outline("k");
  out.draw(body, lean, 0);

  // set-square ears poking out under the hat
  out.draw(ear(W, H, CX, -1, 30 + dy, 12 + dy + ea, [18, 31], ea, 3), lean, 0);
  out.draw(ear(W, H, CX, 1, 30 + dy, 12 + dy + ea, [18, 31], ea, 3), lean, 0);

  // hard hat
  const hat = new Layer(W, H);
  hat.ellipse(CX, 27 + dy, 16, 11, WOOD, { bias: 0.2 });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (y > 27 + dy) hat.px[y][x] = ".";
  hat.poly([[CX - 19, 26 + dy], [CX + 19, 26 + dy], [CX + 20, 30 + dy], [CX - 20, 30 + dy]], WOOD, (x, y) => 0.25 + (30 + dy - y) / 8);
  hat.line(CX, 17 + dy, CX, 26 + dy, "t");
  hat.line(CX - 5, 19 + dy, CX - 5, 26 + dy, "t");
  hat.line(CX + 5, 19 + dy, CX + 5, 26 + dy, "t");
  if (!back) { hat.set(CX - 1, 22 + dy, "x"); hat.set(CX, 22 + dy, "z"); hat.set(CX + 1, 22 + dy, "x"); hat.set(CX, 23 + dy, "s"); }
  out.draw(hat.outline("k"), lean, 0);
  out.draw(compass(W, H, CX, 7 + dy, 4), lean, 0);

  if (!back) {
    const f = new Layer(W, H);
    const ey = 36 + dy;
    for (const [ex, s] of [[31, -1], [49, 1]]) {
      if (blink) { f.line(ex - 3, ey + 1, ex + 3, ey + 1, "k"); f.line(ex - 2, ey + 2, ex + 2, ey + 2, "d"); }
      else {
        f.ellipse(ex, ey, 4.8, 5.2, ["h", "w", "w"], { bias: 0.3 });
        f.ellipse(ex + s * 0.6, ey + 0.6, 2.5, 3.2, ["k", "d"], { bias: -0.4 });
        f.set(ex + s * 0.6 - 1, ey - 1, "w");
      }
      for (let i = 1; i <= 3; i++) f.set(ex + s * i, ey + 6, "n");
    }
    // round drafting spectacles
    for (const ex of [31, 49]) ring(f, ex, ey, 6.4, 6.6, "k");
    const my = 43 + dy;
    if (mouth === "open") { f.ellipse(CX, my + 1, 3.8, 3, ["k", "m", "n"], { bias: -0.1 }); f.set(CX - 1, my - 1, "w"); f.set(CX + 1, my - 1, "w"); }
    else if (mouth === "oh") f.ellipse(CX, my + 1, 2, 2.4, ["k", "m"], { bias: -0.2 });
    else { f.line(CX - 4, my, CX - 3, my + 1, "k"); f.line(CX - 3, my + 1, CX + 3, my + 1, "k"); f.line(CX + 3, my + 1, CX + 4, my, "k"); }
    out.draw(f, lean, 0);
  }
  return out;
}

function animSet(make, W, H) {
  const idle = [make({}), make({ dy: 1, tail: 6 }), make({ dy: 1, tail: 10, blink: true }), make({ dy: 0, tail: 4, ear: 1 })];
  const attack = [
    make({ dy: 1, squash: 2, tail: -20, arms: 0.2, mouth: "oh" }),
    make({ dy: -2, lean: 3, tail: 24, arms: 1, mouth: "open", ear: -1 }),
    make({ dy: 0, lean: 2, tail: 18, arms: 0.6, mouth: "open" }),
  ];
  const hurt = [make({ dy: 2, lean: -2, blink: true, mouth: "oh", tail: -14, ear: 2, flinch: true }), make({ dy: 1, lean: -1, blink: true, mouth: "oh", tail: -8, ear: 1, flinch: true })];
  const f0 = make({ dy: 1, blink: true, mouth: "oh" });
  const faint = [f0, dissolve(f0, 0.15, 3), dissolve(f0, 0.5, 6), dissolve(f0, 0.85, 9)];
  const base = make({});
  const ax = W / 2, ay = H - 6;
  const evolve = [whiten(base, 0.4, "w"), scaleLayer(whiten(base, 1, "w"), 1.12, 0.92, ax, ay), scaleLayer(whiten(base, 1, "w"), 0.94, 1.1, ax, ay), sparkle(whiten(base, 1, "w"), Math.round(W * 0.78), 14, 3, "z", "w")];
  return { idle, attack, hurt, faint, evolve };
}

const fps = { idle: 4, attack: 8, hurt: 8, faint: 6, evolve: 6 };
emit("game/sprites/creatures/draftling-back.ts", {
  id: "draftling-back", name: "DRAFTLING (back)", w: 64, h: 64, palette, fps, script: "draftling-forms",
  anims: animSet(draftlingBack, 64, 64),
  comment: "Draftling seen from behind (the player's side of the battle): gridded back, set-square ears, compass and pencil tail.",
});
emit("game/sprites/creatures/architect.ts", {
  id: "architect", name: "ARCHITECT", w: 80, h: 80, palette, fps, script: "draftling-forms",
  anims: animSet((p) => architect(p), 80, 80),
  comment: "Draftling's evolution: a hard hat over the set-square ears, spectacles, a strapped blueprint scroll and a long pencil tail.",
});
emit("game/sprites/creatures/architect-back.ts", {
  id: "architect-back", name: "ARCHITECT (back)", w: 80, h: 80, palette, fps, script: "draftling-forms",
  anims: animSet((p) => architect({ ...p, back: true }), 80, 80),
  comment: "Architect seen from behind: hard hat, gridded back, strap and scroll.",
});
