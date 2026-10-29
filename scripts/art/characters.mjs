// The player and Ada Lintwell: 24×32 overworld walkers (down / up / right,
// 4-frame walk cycles; the game mirrors "right" for left) and 48×48 dialogue
// portraits (idle blink + talk). Same painter as the creatures.
// Run: node scripts/art/characters.mjs   (ART_PREVIEW=<dir> writes contact sheets)
import { Layer, emit, ring } from "./paint.mjs";

const SKIN = ["1", "2", "3"], HAIR = ["h", "H", "j"], CLOTH = ["c", "C", "D"], PANTS = ["p", "P"], PAPER = ["z", "z", "y"];
const base = { k: "#1a1420", e: "#1a1420", w: "#ffffff", o: "#4a3020", m: "#8a3b3b", n: "#ff9fb0", x: "#b5650f", y: "#f0b429", z: "#efe3b8" };

const PLAYER = {
  id: "player", name: "You", kind: "tube",
  palette: { ...base, 1: "#b9714a", 2: "#e0a074", 3: "#f6cfa3", h: "#2b1a12", H: "#4a2c1b", j: "#7a4a2c", c: "#14585c", C: "#1f8f8a", D: "#4cc9bd", p: "#3a4256", P: "#566078", o: "#8a3b12" },
};
const ADA = {
  id: "ada", name: "Ada Lintwell", kind: "ada",
  palette: { ...base, 1: "#b8806a", 2: "#e2b196", 3: "#f7d9c2", h: "#8a93a3", H: "#c4ccd8", j: "#f1f4f9", c: "#6b2d5c", C: "#a04a8a", D: "#d98cc4", p: "#343a46", P: "#4b5362" },
};

/** A limb as a slanted quad from (tx, ty) to (bx, by), `w` wide. */
function limb(L, tx, ty, bx, by, w, ramp, lit = 0.6) {
  const h = w / 2;
  L.poly([[tx - h, ty], [tx + h, ty], [bx + h, by], [bx - h, by]], ramp, (x) => lit - ((x - tx) / w) * 0.35);
}

function walker(o, { dir, step = 0, breathe = 0, blink = false }) {
  const W = 24, H = 32, ada = o.kind === "ada";
  const out = new Layer(W, H);
  const odd = step === 1 || step === 3;
  const bob = dir === "idle" ? breathe : odd ? 1 : 0;
  const side = dir === "right";
  const sgn = step === 1 ? 1 : step === 3 ? -1 : 0;
  const part = (fn) => { const L = new Layer(W, H); fn(L); out.draw(L.outline("k")); };
  const skirtEnd = 28;

  const legs = () => {
    if (ada) {
      // long skirt hem swings; two shoe tips peek out
      part((L) => {
        const sw = side ? sgn * 2 : 0;
        L.poly([[8, 22 + bob], [16, 22 + bob], [18 + sw, skirtEnd], [6 + sw, skirtEnd]], PANTS, (x, y) => 0.7 - (x - 6) / 24 - (y - 22) / 40);
      });
      part((L) => {
        const lift = (s) => (dir === "idle" || dir === "up" || dir === "down" ? (step === s ? 1 : 0) : 0);
        const fx = side ? [12 + sgn * 3, 12 - sgn * 3] : [10, 14];
        fx.forEach((x, i) => { L.poly([[x - 1.5, 29 - lift(i ? 3 : 1)], [x + (side ? 3 : 1.5), 29 - lift(i ? 3 : 1)], [x + (side ? 3 : 1.5), 31], [x - 1.5, 31]], ["o"], () => 0.5); });
      });
      return;
    }
    const pair = side
      ? [[12 - sgn * 3, 0.45], [12 + sgn * 3, 0.65]]
      : [[10, 0.65, step === 1 ? 0 : step === 3 ? 2 : 0], [14, 0.5, step === 3 ? 0 : step === 1 ? 2 : 0]];
    for (const [x, lit, lift = step === 2 && !side ? 0 : 0] of pair) {
      part((L) => {
        const by = 30 - lift;
        limb(L, 12 + (x - 12) * 0.4, 22 + bob, x, by - 2, 4, PANTS, lit);
        L.poly([[x - 2, by - 2], [x + (side ? 4 : 2), by - 2], [x + (side ? 4 : 2), by + 0.5], [x - 2, by + 0.5]], ["o"], () => 0.5);
      });
    }
  };

  const arm = (x, swing, lit) => part((L) => {
    const y1 = 16 + bob;
    limb(L, x, y1, x - (side ? swing : 0), y1 + 6 + (side ? 0 : swing), 3, CLOTH, lit);
    const hx = x - (side ? swing : 0), hy = y1 + 7 + (side ? 0 : swing);
    L.poly([[hx - 1.2, hy - 1], [hx + 1.2, hy - 1], [hx + 1.2, hy + 1], [hx - 1.2, hy + 1]], ["2"], () => 0.5);
  });

  const torso = () => part((L) => {
    const y1 = 15 + bob, y2 = ada ? 25 : 23 + bob;
    if (side) L.poly([[9, y1], [15, y1], [15.5, y2], [8.5, y2]], CLOTH, (x) => 0.85 - (x - 9) / 9);
    else L.poly([[8, y1], [16, y1], [17, y2], [7, y2]], CLOTH, (x) => 0.85 - (x - 8) / 12);
    if (dir === "down" || dir === "idle") {
      if (ada) { L.line(12, y1, 12, y2 - 1, "C"); L.set(11, y1, "w"); L.set(13, y1, "w"); L.set(12, y1 + 1, "w"); L.set(9, y1 + 6, "c"); L.set(10, y1 + 6, "c"); }
      else { L.line(8, y1 + 1, 15, y1 + 7, "x"); L.line(8, y1 + 2, 15, y1 + 8, "x"); L.line(12, y1, 12, y1 + 2, "c"); }
    }
    if (!ada) L.poly([[7.5, y2 - 3], [16.5, y2 - 3], [17, y2 - 2], [7, y2 - 2]], ["x"], () => 0.4); // belt
  });

  const pack = () => {
    if (ada) return;
    if (dir === "up") part((L) => { L.poly([[8, 16 + bob], [16, 16 + bob], [16, 24 + bob], [8, 24 + bob]], ["x", "y"], (x) => 0.3 + (x - 8) / 20); L.poly([[16, 11 + bob], [18, 11 + bob], [18.5, 25 + bob], [16.5, 25 + bob]], PAPER, () => 0.5); L.set(17, 11 + bob, "y"); });
    if (side) part((L) => { L.poly([[6, 16 + bob], [10, 16 + bob], [10, 24 + bob], [6, 24 + bob]], ["x", "y"], (x) => 0.3 + (x - 6) / 14); L.poly([[5, 10 + bob], [7, 10 + bob], [8, 23 + bob], [6, 23 + bob]], PAPER, () => 0.5); L.set(6, 10 + bob, "y"); });
  };

  const head = () => {
    const hy = 9 + bob;
    part((L) => {
      if (ada && dir !== "down" && dir !== "idle") L.ellipse(12 - (side ? 2 : 0), 3 + bob, 3, 2.6, HAIR, { bias: 0.1 }); // bun
      else if (ada) L.ellipse(12, 3 + bob, 3, 2.6, HAIR, { bias: 0.1 });
      L.ellipse(side ? 12.5 : 12, hy, side ? 5 : 5.5, 5.5, SKIN, { bias: 0.05 });
      if (side) L.ellipse(17, hy + 1, 1.2, 1.4, SKIN, { bias: 0.1 }); // nose
    });
    part((L) => {
      if (dir === "up") L.ellipse(12, hy - 0.5, 6, 6, HAIR, { bias: 0 });
      else if (side) { L.ellipse(11, hy - 1, 5.6, 5.4, HAIR, { bias: 0 }); L.poly([[13, hy - 3], [17.5, hy - 1.5], [17.5, hy - 3.5], [13, hy - 6]], HAIR, () => 0.55); }
      else { L.ellipse(12, hy - 3.2, 6.2, 3.9, HAIR, { bias: 0.05 }); L.set(6, hy - 1, "h"); L.set(18, hy - 1, "h"); if (!ada) L.poly([[7, hy - 2], [9.5, hy], [11, hy - 3]], HAIR, () => 0.4); }
    });
    const f = new Layer(W, H);
    if (dir === "down" || dir === "idle") {
      for (const x of [9.5, 14.5]) { if (blink) f.line(x - 1, hy + 1, x + 1, hy + 1, "k"); else { f.set(x, hy + 1, "e"); f.set(x, hy + 2, "e"); } }
      f.set(9, hy + 4, "n"); f.set(15, hy + 4, "n"); f.line(11, hy + 4, 13, hy + 4, "m");
      if (ada) { f.line(8, hy, 11, hy, "y"); f.line(13, hy, 16, hy, "y"); f.set(12, hy, "y"); f.set(8, hy + 3, "y"); f.set(11, hy + 3, "y"); f.set(13, hy + 3, "y"); f.set(16, hy + 3, "y"); }
    } else if (side) {
      if (blink) f.line(14, hy + 1, 16, hy + 1, "k"); else { f.set(15, hy + 1, "e"); f.set(15, hy + 2, "e"); }
      f.set(15, hy + 4, "m"); f.set(16, hy + 4, "m");
      if (ada) { f.line(13, hy, 17, hy, "y"); f.set(13, hy + 3, "y"); f.set(17, hy + 3, "y"); f.line(10, hy, 13, hy, "y"); }
    }
    if (ada && dir !== "up") { const px = side ? 9 : 17; f.set(px, hy - 1, "y"); f.set(px, hy, "x"); } // pencil behind the ear
    out.draw(f);
  };

  const swing = dir === "idle" ? 0 : sgn * 2;
  if (side) { arm(14, -swing, 0.4); legs(); torso(); pack(); head(); arm(12, swing, 0.7); }
  else { legs(); torso(); pack(); arm(6.5, dir === "idle" ? 0 : sgn, 0.7); arm(17.5, dir === "idle" ? 0 : -sgn, 0.5); head(); }
  return out;
}

function walkerSprite(o) {
  const cyc = (dir) => [0, 1, 2, 3].map((step) => walker(o, { dir, step }));
  return {
    idle: [walker(o, { dir: "idle", breathe: 0 }), walker(o, { dir: "idle", breathe: 1 }), walker(o, { dir: "idle", breathe: 1, blink: true }), walker(o, { dir: "idle", breathe: 0 })],
    "walk-down": cyc("down"), "walk-up": cyc("up"), "walk-right": cyc("right"),
  };
}

function portrait(o, { blink = false, mouth = "closed" }) {
  const W = 48, H = 48, ada = o.kind === "ada";
  const out = new Layer(W, H);
  const part = (fn) => { const L = new Layer(W, H); fn(L); out.draw(L.outline("k")); };
  if (ada) part((L) => { L.ellipse(24, 5, 6, 4.6, HAIR, { bias: 0.1 }); L.ellipse(24, 20, 14, 15, HAIR, { bias: -0.15 }); });
  part((L) => L.poly([[3, 48], [8, 37], [40, 37], [45, 48]], CLOTH, (x, y) => 0.8 - (x - 3) / 70 - (y - 37) / 40));
  part((L) => {
    L.poly([[19, 29], [29, 29], [30, 40], [18, 40]], SKIN, () => 0.2);
    if (ada) { L.poly([[16, 37], [24, 46], [32, 37], [29, 37], [24, 42], [19, 37]], ["w"], () => 0.5); }
    else { L.poly([[17, 37], [31, 37], [29, 41], [19, 41]], ["c"], () => 0.4); }
  });
  part((L) => {
    L.ellipse(12.5, 23, 2.4, 3.4, SKIN, { bias: -0.05 }); L.ellipse(35.5, 23, 2.4, 3.4, SKIN, { bias: -0.05 });
    L.ellipse(24, 21, 11, 13, SKIN, { bias: 0.1 });
  });
  part((L) => {
    if (ada) L.poly([[12.5, 21], [13, 11], [24, 6.5], [35, 11], [35.5, 21], [32, 14], [24, 11.5], [16, 14]], HAIR, (x) => 0.85 - (x - 12) / 40);
    else L.poly([[12, 19], [11, 11], [17, 5], [26, 3], [34, 6], [37, 12], [36, 19], [33, 12], [29, 14], [24, 10], [20, 14], [16, 13]], HAIR, (x, y) => 0.7 - (x - 11) / 50 - (y - 3) / 40);
  });
  const f = new Layer(W, H);
  for (const x of [19, 29]) {
    if (blink) { f.line(x - 3, 23, x + 3, 23, "k"); f.line(x - 2, 24, x + 2, 24, "1"); }
    else { f.ellipse(x, 23, 3, 3.2, ["1", "w", "w"], { bias: 0.4 }); f.ellipse(x + 0.3, 23.4, 1.7, 2, ["k", "h"], { bias: -0.3 }); f.set(x - 1, 22, "w"); }
    f.line(x - 3, 18, x + 3, ada ? 18 : 17, ada ? "H" : "h"); f.line(x - 3, 17, x + 3, ada ? 17 : 16, ada ? "H" : "h");
  }
  f.set(24, 26, "1"); f.set(23, 27, "1"); f.set(24, 27, "1");
  f.set(15, 28, "n"); f.set(16, 28, "n"); f.set(32, 28, "n"); f.set(33, 28, "n");
  if (mouth === "open") { f.ellipse(24, 32, 3.2, 2.4, ["k", "m", "n"], { bias: -0.1 }); f.set(22, 30, "w"); f.set(23, 30, "w"); f.set(25, 30, "w"); f.set(26, 30, "w"); }
  else if (ada) { f.line(21, 31, 27, 31, "m"); f.set(20, 30, "m"); f.set(28, 30, "m"); }
  else { f.line(21, 31, 27, 31, "m"); f.line(20, 30, 21, 31, "m"); f.line(27, 31, 28, 30, "m"); }
  if (ada) {
    ring(f, 19, 23, 5.4, 5.4, "y", 1.4); ring(f, 29, 23, 5.4, 5.4, "y", 1.4); f.line(24, 22, 24, 23, "y"); f.line(13, 22, 14, 22, "y"); f.line(34, 22, 35, 22, "y");
    for (const [x, y] of [[13, 25], [12, 26], [35, 25], [36, 26], [20, 29], [28, 29]]) f.set(x, y, "1");
    f.set(36, 12, "y"); f.set(36, 13, "y"); f.set(36, 14, "x"); f.set(36, 15, "x"); // pencil tucked behind the ear
  } else {
    f.set(21, 32, "1");
  }
  out.draw(f);
  return out;
}

function portraitSprite(o) {
  return {
    idle: [portrait(o, {}), portrait(o, {}), portrait(o, { blink: true }), portrait(o, {})],
    talk: [portrait(o, { mouth: "open" }), portrait(o, {})],
  };
}

for (const o of [PLAYER, ADA]) {
  emit(`game/sprites/characters/${o.id}.ts`, {
    id: o.id, name: o.name, w: 24, h: 32, palette: o.palette, script: "characters",
    fps: { idle: 3, "walk-down": 8, "walk-up": 8, "walk-right": 8 },
    anims: walkerSprite(o),
    comment: o.kind === "ada" ? "Ada Lintwell, overworld walker: plum cardigan, long skirt, round glasses and a silver bun." : "The player, overworld walker: teal jacket, a blueprint tube on the back and a tool belt.",
  });
  emit(`game/sprites/characters/${o.id}-portrait.ts`, {
    id: `${o.id}-portrait`, name: `${o.name} (portrait)`, w: 48, h: 48, palette: o.palette, script: "characters",
    fps: { idle: 3, talk: 6 },
    anims: portraitSprite(o),
    comment: `${o.name}, 48×48 dialogue portrait (idle blink, talk).`,
  });
}
