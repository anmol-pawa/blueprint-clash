// DRAFTLING, the player's starter Patternling: a round blueprint-blue creature
// with a pencil horn, set-square ears and a ruler tail. Front + back, 64×64.
// Run: node scripts/art/draftling.mjs   (ART_PREVIEW=<dir> also writes contact sheets)
import { Layer, emit, halo, scaleLayer, sparkle, whiten } from "./paint.mjs";

const W = 64;
const H = 64;
const palette = {
  k: "#0f1a33", // outline
  d: "#1f3f7a", // body ramp (blueprint blue), dark → light
  c: "#3465b8",
  b: "#5c93e0",
  a: "#a9ceff",
  h: "#8a4a14", // set-square ramp (amber acetate)
  g: "#c47a22",
  f: "#eba440",
  e: "#ffd98a",
  j: "#b9a878", // paper / ruler ramp
  i: "#e8dcae",
  l: "#fff7d6",
  y: "#ffcf3d", // pencil body, lit
  Y: "#c99410", // pencil body, shade
  t: "#e9c28a", // pencil wood
  z: "#3a3a48", // graphite
  m: "#9c2652", // mouth
  r: "#ff8fb4", // cheek
  v: "#35b3d8", // iris
  n: "#7fb2f0", // grid line on the belly
  o: "#d2fff7", // glow
  w: "#ffffff",
};
const BODY = ["d", "c", "b", "a"];
const SQUARE = ["h", "g", "f", "e"];
const PAPER = ["j", "i", "l"];

/** A set-square ear on side s (−1 left, +1 right), with a triangular cut-out. */
function ear(cy, s, tilt, back) {
  const L = new Layer(W, H);
  const X = (x) => 32 + s * x;
  L.poly(
    [
      [X(7), cy - 9],
      [X(17 + tilt * 0.5), cy - 23 + tilt],
      [X(18), cy - 7],
    ],
    SQUARE,
    (x, y) => 0.8 - (s > 0 ? 0.25 : 0) - (y - (cy - 23)) / 55,
  );
  if (!back) {
    L.poly(
      [
        [X(11), cy - 10],
        [X(15.5 + tilt * 0.4), cy - 18 + tilt * 0.7],
        [X(15.5), cy - 9],
      ],
      ".",
    );
    // degree ticks along the long edge
    for (let i = 0; i < 3; i++) L.set(X(10 + i * 3), cy - 9 - i * 4 + tilt * 0.2, "h");
  }
  L.outline("k");
  return L;
}

/** The ruler tail curling up behind the body on the right. */
function tail(cy, wag, front) {
  const L = new Layer(W, H);
  const tipX = 57 + wag * 0.3;
  const tipY = cy - 14 + wag;
  L.poly(
    [
      [41, cy + 6],
      [43, cy + 11],
      [tipX + 1, tipY + 5],
      [tipX - 3, tipY],
    ],
    PAPER,
    (x, y) => 0.75 - (y - tipY) / 40,
  );
  // tick marks along the edge
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const x = 42 + (tipX - 42) * t;
    const y = cy + 8 + (tipY + 2 - cy - 8) * t;
    L.set(x - 1, y - (i % 2 ? 1 : 2), front ? "j" : "k");
  }
  L.outline("k");
  return L;
}

/** The pencil horn: a sharpened yellow pencil growing from the crown. */
function pencil(cy, glow, out) {
  const top = cy - 31;
  const L = new Layer(W, H);
  L.poly([[29, cy - 12], [35, cy - 12], [35, cy - 24], [29, cy - 24]], "y");
  for (let y = cy - 24; y <= cy - 12; y++) {
    L.set(29, y, "y");
    L.set(30, y, "y");
    L.set(34, y, "Y");
    L.set(35, y, "Y");
    L.set(32, y, y % 4 === 0 ? "Y" : "y"); // faceted ridge
  }
  L.poly([[29, cy - 24], [35, cy - 24], [32, top + 4]], "t");
  L.poly([[31, top + 4], [33, top + 4], [32, top]], "z");
  L.outline("k");
  out.draw(L);
  if (glow) {
    sparkle(out, 32, top - 2, 2, "o", "w");
    out.set(28, top + 3, "o");
    out.set(36, top + 4, "o");
  }
}

function frame({ bob = 0, wag = 0, tilt = 0, mouth = false, face = "normal", glow = false }) {
  const out = new Layer(W, H);
  const cy = 38 + bob;
  out.draw(tail(cy, wag, true));
  for (const s of [-1, 1]) out.draw(ear(cy, s, tilt, false));

  const body = new Layer(W, H);
  body.ellipse(32, cy, 15, 14, BODY);
  body.ellipse(26, cy + 14, 3.5, 2, BODY, { bias: -0.15 });
  body.ellipse(38, cy + 14, 3.5, 2, BODY, { bias: -0.25 });
  body.outline("k");
  out.draw(body);
  pencil(cy, glow, out);

  // belly: a sheet of graph paper
  const belly = new Layer(W, H);
  belly.ellipse(32, cy + 8, 8, 5.5, PAPER, { bias: 0.2 });
  belly.clip((x, y) => {
    if ((x + 2) % 4 === 0 || (y + 1) % 4 === 0) belly.px[y][x] = "n";
  });
  out.draw(belly);

  for (const [ex, s] of [
    [26, -1],
    [38, 1],
  ]) {
    if (face !== "normal") {
      if (face === "hurt") {
        const a = -s;
        out.line(ex - 2 * a, cy - 5, ex + 2 * a, cy - 3, "k");
        out.line(ex - 2 * a, cy - 1, ex + 2 * a, cy - 3, "k");
      } else {
        out.line(ex - 2, cy - 5, ex + 2, cy - 1, "k");
        out.line(ex - 2, cy - 1, ex + 2, cy - 5, "k");
      }
      out.set(ex + s * 3, cy + 3, "r");
      out.set(ex + s * 2, cy + 3, "r");
      continue;
    }
    const e = new Layer(W, H);
    e.ellipse(ex, cy - 3, 4, 4.6, ["w", "w"]);
    e.outline("k");
    out.draw(e);
    const ix = ex - s;
    for (let y = cy - 5; y <= cy; y++) for (let x = ix - 1; x <= ix + 1; x++) out.set(x, y, y === cy - 5 ? "c" : "v");
    for (let y = cy - 4; y <= cy - 1; y++) for (let x = ix - 1 + (s > 0 ? 0 : 1); x <= ix + (s > 0 ? 0 : 1); x++) out.set(x, y, "k");
    out.set(ix - 1, cy - 4, "w");
    out.set(ix + 1, cy - 1, "w");
    out.set(ex + s * 3, cy + 3, "r");
    out.set(ex + s * 2, cy + 3, "r");
  }

  if (mouth) {
    for (let x = 29; x <= 35; x++) out.set(x, cy + 3, "k");
    for (let x = 30; x <= 34; x++) for (let y = cy + 4; y <= cy + 6; y++) out.set(x, y, "m");
    for (let x = 30; x <= 34; x++) out.set(x, cy + 7, "k");
    out.set(29, cy + 4, "k");
    out.set(35, cy + 4, "k");
  } else {
    out.line(30, cy + 3, 31, cy + 4, "k");
    out.line(33, cy + 4, 34, cy + 3, "k");
    out.line(31, cy + 4, 33, cy + 4, "k");
  }
  return out;
}

/** Back view: a rolled blueprint strapped across the back, ruler tail visible. */
function backFrame({ bob = 0, wag = 0, tilt = 0 }) {
  const out = new Layer(W, H);
  const cy = 38 + bob;
  out.draw(tail(cy, wag, false));
  for (const s of [-1, 1]) out.draw(ear(cy, s, tilt, true));
  const body = new Layer(W, H);
  body.ellipse(32, cy, 16, 15, BODY, { bias: -0.08 });
  body.ellipse(26, cy + 15, 3.5, 2, BODY, { bias: -0.3 });
  body.ellipse(38, cy + 15, 3.5, 2, BODY, { bias: -0.35 });
  body.outline("k");
  out.draw(body);
  pencil(cy, false, out);
  // rolled blueprint, slung diagonally with a strap
  const roll = new Layer(W, H);
  roll.poly([[20, cy - 2], [24, cy - 6], [46, cy + 6], [42, cy + 10]], PAPER, (x, y) => 0.85 - (y - cy) / 30);
  roll.ellipse(23, cy - 4, 3, 3, ["j", "i", "l"], { bias: 0.1 });
  roll.set(23, cy - 4, "n");
  roll.outline("k");
  out.draw(roll);
  out.line(30, cy + 1, 30, cy + 5, "c");
  out.line(38, cy + 4, 38, cy + 8, "c");
  out.set(25, cy - 4, "n");
  return out;
}

const sink = (layer, dy) => new Layer(W, H).draw(layer, 0, dy);
const lunge = (layer, dx, dy) => new Layer(W, H).draw(layer, dx, dy);

function evolveFrames() {
  const base = frame({ tilt: -2 });
  const tall = frame({ tilt: -4, glow: true });
  const folded = frame({ bob: 2, tilt: 2 });
  const sil = (l) => halo(whiten(l, 1, "w"), "o");
  const grow = (l, sx, sy) => scaleLayer(l, sx, sy, 32, 60);
  const sparks = (l, pts) => {
    for (const [x, y, r] of pts) sparkle(l, x, y, r, "o", "w");
    return l;
  };
  return [
    sparks(new Layer(W, H).draw(base), [[8, 50, 2], [56, 6, 2]]),
    sparks(halo(whiten(base, 0.35, "w"), "o"), [[5, 42, 2], [58, 50, 2], [22, 4, 1]]),
    sparks(halo(whiten(base, 0.7, "w"), "o"), [[4, 52, 1], [60, 56, 2], [44, 3, 2]]),
    sil(base),
    sil(grow(folded, 0.84, 0.84)),
    sil(grow(tall, 1.03, 1.07)),
    sil(grow(folded, 0.78, 0.78)),
    sparks(sil(grow(tall, 1.03, 1.07)), [[4, 54, 3], [59, 55, 3], [11, 61, 1], [53, 61, 1]]),
  ];
}

emit(new URL("../../game/sprites/creatures/draftling.ts", import.meta.url), {
  id: "draftling",
  name: "DRAFTLING",
  w: W,
  h: H,
  palette,
  comment: "The starter Patternling: a blueprint-blue creature with a pencil horn, set-square ears and a ruler tail. Front view, 64×64.",
  fps: { idle: 5, attack: 8, hurt: 8, faint: 6, evolve: 6 },
  anims: {
    idle: [frame({ wag: -2, tilt: 0 }), frame({ wag: 0, bob: 1, tilt: 1 }), frame({ wag: 2, bob: 2, tilt: 2 }), frame({ wag: 0, bob: 1, tilt: 1 })],
    attack: [lunge(frame({ wag: 4, mouth: true, glow: true }), -2, -2), lunge(frame({ wag: -4, mouth: true, glow: true, tilt: 2 }), 2, 2), frame({ bob: 1 })],
    hurt: [frame({ bob: 2, tilt: 3, face: "hurt", wag: 3 }), frame({ bob: 1, tilt: 2, face: "hurt" })],
    faint: [frame({ bob: 2, tilt: 4, face: "faint" }), sink(frame({ bob: 2, tilt: 4, face: "faint" }), 6), sink(frame({ bob: 2, tilt: 4, face: "faint" }), 14), sink(frame({ bob: 2, tilt: 4, face: "faint" }), 24)],
    evolve: evolveFrames(),
  },
});

emit(new URL("../../game/sprites/creatures/draftling-back.ts", import.meta.url), {
  id: "draftling-back",
  name: "DRAFTLING (back)",
  w: W,
  h: H,
  palette,
  script: "draftling",
  comment: "DRAFTLING from behind, for the player's side of the battle. 64×64.",
  fps: { idle: 5, attack: 8, hurt: 8, faint: 6 },
  anims: {
    idle: [backFrame({ wag: -2 }), backFrame({ wag: 0, bob: 1, tilt: 1 }), backFrame({ wag: 2, bob: 2, tilt: 2 }), backFrame({ wag: 0, bob: 1, tilt: 1 })],
    attack: [lunge(backFrame({ wag: 4 }), 0, -3), lunge(backFrame({ wag: -4, tilt: 2 }), 0, -5), backFrame({})],
    hurt: [backFrame({ bob: 2, tilt: 3, wag: 3 }), backFrame({ bob: 1, tilt: 2 })],
    faint: [backFrame({ bob: 2, tilt: 4 }), sink(backFrame({ bob: 2, tilt: 4 }), 6), sink(backFrame({ bob: 2, tilt: 4 }), 14), sink(backFrame({ bob: 2, tilt: 4 }), 24)],
  },
});
