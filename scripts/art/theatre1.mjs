// The Behavioural Theatre Patternlings (part 1): CHAMELSTRAT (Strategy), OWLSERVER (Observer), COMMANDANT (Command).
// 64x64, idle 4 / attack 3 / hurt 2 / faint 4 / evolve 4.
// Run: node scripts/art/theatre1.mjs   (ART_PREVIEW=<dir> writes contact sheets)
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

// -------------------------------------------------------------- CHAMELSTRAT
// A green chameleon whose body carries three swappable colour patches (interchangeable algorithms behind one slot).
const CH_PAL = {
  k: "#10281a", d: "#2e7a3c", c: "#4fb04e", b: "#8ad76a", a: "#d4f5a4", // green skin
  r: "#a83a3a", s: "#e0605a", t: "#ffa090", // red patch
  u: "#2f6fc4", v: "#5aa8f0", e: "#a8dcff", // blue patch
  y: "#d9a21b", x: "#ffd75a", // yellow patch
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", h: "#d8d8e0", g: "#3d3a46",
};
const SKIN = ["d", "c", "b", "a"];
function chamelstrat({ dy = 0, lean = 0, blink = false, mouth = "smile", tail = 0, squash = 0, patch = 0, tongue = 0 }) {
  const out = new Layer(W, H);
  const b = new Layer(W, H);
  const by = 42 + dy + squash;
  // curled tail
  b.ellipse(12 - tail, by + 6, 6, 5, SKIN, { bias: -0.15 });
  b.ellipse(8 - tail, by - 2 - tail, 4, 4, SKIN, { bias: -0.2 });
  b.ellipse(11 - tail, by - 6 - tail, 2.6, 2.6, SKIN, { bias: -0.2 });
  // legs
  b.ellipse(24, 58, 5, 2.6, SKIN, { bias: -0.2 });
  b.ellipse(40, 58, 5, 2.6, SKIN, { bias: -0.3 });
  // body + head
  b.ellipse(30, by, 16, 13 - squash * 0.5, SKIN);
  b.ellipse(36, 26 + dy + squash, 14, 12, SKIN, { bias: 0.05 });
  b.ellipse(48, 28 + dy + squash, 5, 4, SKIN, { bias: 0.1 });
  // crest
  b.poly([[26, 16 + dy], [32, 9 + dy], [38, 15 + dy]], SKIN);
  ink(b);
  out.draw(b, lean, 0);
  // three colour patches along the back: the active one is bright, the others dim (strategies in a slot)
  const p = new Layer(W, H);
  const cols = [["r", "s", "t"], ["u", "v", "e"], ["y", "x", "w"]];
  for (let i = 0; i < 3; i++) {
    const on = i === patch % 3;
    p.ellipse(20 + i * 10, by - 2 + (on ? -1 : 0), on ? 4.2 : 3.4, on ? 4.2 : 3.4, cols[i], { bias: on ? 0.1 : -0.3 });
  }
  out.draw(ink(p), lean, 0);
  // tongue lashing out (attack)
  if (tongue) {
    const t = new Layer(W, H);
    t.line(51, 31 + dy, 51 + tongue * 4, 31 + dy + 1, "s");
    t.line(51, 32 + dy, 51 + tongue * 4, 32 + dy + 1, "s");
    t.ellipse(52 + tongue * 4, 32 + dy, 2.4, 2.4, ["r", "s", "t"]);
    out.draw(ink(t), lean, 0);
  }
  const f = new Layer(W, H);
  const ey = 24 + dy + squash;
  eye(f, 37, ey, 1, blink, 4.4);
  if (mouth === "open") f.ellipse(49, 32 + dy + squash, 3.4, 1.8, ["k", "m", "n"]);
  else f.line(46, 32 + dy + squash, 52, 32 + dy + squash, "k");
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const chAnims = animate(chamelstrat, {
  idle: [{ patch: 0 }, { dy: 1, tail: 1, patch: 0 }, { dy: 1, blink: true, tail: 2, patch: 1 }, { dy: 0, tail: 1, patch: 1 }],
  attack: [{ dy: 1, squash: 2, tail: -2, mouth: "open", patch: 2 }, { dy: -1, lean: 2, tail: 3, mouth: "open", tongue: 3, patch: 2 }, { lean: 1, tail: 2, mouth: "open", tongue: 1, patch: 2 }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", tail: -2 }, { dy: 1, lean: -1, blink: true, tail: -1 }],
});
emit("game/sprites/creatures/chamelstrat.ts", { id: "chamelstrat", name: "CHAMELSTRAT", w: W, h: H, palette: CH_PAL, fps: FPS, anims: chAnims, script: "theatre1", comment: "Strategy: a chameleon whose back carries interchangeable colour patches; one is active at a time and the caller never cares which." });

// ---------------------------------------------------------------- OWLSERVER
// A plum owl on a perch; sound rings ripple outward to a row of tiny bell-chicks (many observers of one subject).
const OW_PAL = {
  k: "#1e1430", d: "#5a3a7a", c: "#8a62b0", b: "#b894d8", a: "#e6d4f6", // plum feathers
  p: "#f4e6d0", q: "#ffffff", // belly
  y: "#d9a21b", x: "#ffd75a", o: "#e07a5a", // beak/bells
  s: "#7a5a3a", t: "#a8805a", // perch
  e: "#7be0ff", u: "#2f9fe0", // sound rings
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", h: "#d8d8e0", g: "#3d3a46",
};
const FEATHER = ["d", "c", "b", "a"];
function owlserver({ dy = 0, lean = 0, blink = false, mouth = "smile", squash = 0, ring = 0, wing = 0 }) {
  const out = new Layer(W, H);
  // observers: a row of small bell-chicks along the ground
  const row = new Layer(W, H);
  for (let i = 0; i < 4; i++) {
    const x = 8 + i * 15;
    const y = 54 + ((i + ring) % 2);
    row.ellipse(x, y, 4, 4, ["y", "x", "w"], { bias: 0.05 });
    row.set(x - 1, y - 1, "k");
    row.set(x + 1, y - 1, "k");
  }
  out.draw(ink(row), lean, 0);
  // sound rings from the subject
  const rg = new Layer(W, H);
  for (const r of [10 + ring * 3, 18 + ring * 3]) {
    for (let a = 0; a < 6.3; a += 0.12) {
      const x = 32 + Math.cos(a) * r * 1.5;
      const y = 28 + Math.sin(a) * r;
      if (y < 44) rg.set(x, y, r > 14 ? "u" : "e");
    }
  }
  out.draw(rg, 0, 0);
  // perch
  const pr = new Layer(W, H);
  pr.poly([[12, 47], [52, 47], [52, 50], [12, 50]], ["s", "t"]);
  out.draw(ink(pr), 0, 0);
  const b = new Layer(W, H);
  const by = 32 + dy + squash;
  b.ellipse(16, by + 2, 6, 11 - wing, FEATHER, { bias: -0.2 });
  b.ellipse(48, by + 2, 6, 11 - wing, FEATHER, { bias: -0.2 });
  b.ellipse(32, by, 15, 16 - squash * 0.5, FEATHER);
  b.ellipse(32, by + 5, 9, 9, ["p", "q"], { bias: 0.05 });
  b.poly([[19, by - 12], [22, by - 21], [27, by - 14]], FEATHER);
  b.poly([[37, by - 14], [42, by - 21], [45, by - 12]], FEATHER);
  b.ellipse(26, 46, 3, 1.6, ["y", "x"]);
  b.ellipse(38, 46, 3, 1.6, ["y", "x"]);
  ink(b);
  out.draw(b, lean, 0);
  const f = new Layer(W, H);
  const ey = by - 6;
  eye(f, 25, ey, -1, blink, 5);
  eye(f, 39, ey, 1, blink, 5);
  f.poly([[30, ey + 3], [34, ey + 3], [32, ey + 8]], ["o", "y", "x"]);
  if (mouth === "open") f.ellipse(32, ey + 10, 2.4, 1.6, ["k", "m", "n"]);
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const owAnims = animate(owlserver, {
  idle: [{ ring: 0 }, { dy: 1, ring: 1 }, { dy: 1, blink: true, ring: 2, wing: 1 }, { dy: 0, ring: 1 }],
  attack: [{ dy: 1, squash: 2, mouth: "open", ring: 0 }, { dy: -2, lean: 2, mouth: "open", ring: 3, wing: 3 }, { lean: 1, mouth: "open", ring: 2, wing: 1 }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", wing: 2 }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/owlserver.ts", { id: "owlserver", name: "OWLSERVER", w: W, h: H, palette: OW_PAL, fps: FPS, anims: owAnims, script: "theatre1", comment: "Observer: a plum owl on a perch; its hoot ripples out to a row of bell-chicks that each react without the owl knowing who they are." });

// --------------------------------------------------------------- COMMANDANT
// A stout navy-coated officer-toad holding a rolled order scroll and a brass undo-arrow badge (requests as objects).
const CM_PAL = {
  k: "#0e1a26", d: "#2a4a6a", c: "#3f6f9a", b: "#6ea3cc", a: "#b8dcf2", // navy coat
  r: "#6a8a3a", s: "#8fb04a", t: "#c4dc7a", // toad skin
  p: "#f4e6d0", q: "#ffffff", // scroll
  y: "#d9a21b", x: "#ffd75a", // brass
  o: "#a83a3a", f: "#e0605a", // wax seal
  m: "#c4506a", n: "#ff9fb0", w: "#ffffff", z: "#ffe9b0", e: "#7be0ff", h: "#d8d8e0", g: "#3d3a46",
};
const COAT = ["d", "c", "b", "a"];
const TOAD = ["r", "s", "t"];
function commandant({ dy = 0, lean = 0, blink = false, mouth = "smile", squash = 0, scroll = 0, salute = 0 }) {
  const out = new Layer(W, H);
  const b = new Layer(W, H);
  const by = 42 + dy + squash;
  b.ellipse(22, 58, 5, 2.6, TOAD, { bias: -0.2 });
  b.ellipse(42, 58, 5, 2.6, TOAD, { bias: -0.3 });
  b.ellipse(32, by, 15, 14 - squash * 0.5, COAT);
  b.ellipse(32, 26 + dy + squash, 13, 11, TOAD);
  // cap
  b.poly([[19, 20 + dy], [32, 9 + dy], [45, 20 + dy]], COAT, (x, y) => 0.6 - (y - 9) / 20);
  b.poly([[17, 20 + dy], [47, 20 + dy], [47, 23 + dy], [17, 23 + dy]], ["y", "x"]);
  ink(b);
  out.draw(b, lean, 0);
  // brass buttons
  const bt = new Layer(W, H);
  for (const y of [38, 44, 50]) bt.set(32, y + dy, "x");
  out.draw(bt, lean, 0);
  // scroll held out front (the request object)
  const sc = new Layer(W, H);
  const sx = 48 + scroll;
  sc.poly([[sx - 4, 38 + dy], [sx + 6, 38 + dy], [sx + 6, 54 + dy], [sx - 4, 54 + dy]], ["p", "q"], () => 0.7);
  sc.ellipse(sx + 1, 38 + dy, 5, 2, ["p", "q"]);
  sc.ellipse(sx + 1, 54 + dy, 5, 2, ["p", "q"]);
  sc.line(sx - 2, 43 + dy, sx + 4, 43 + dy, "g");
  sc.line(sx - 2, 46 + dy, sx + 4, 46 + dy, "g");
  sc.ellipse(sx + 1, 50 + dy, 2.2, 2.2, ["o", "f"]);
  out.draw(ink(sc), lean, 0);
  // salute arm
  if (salute) {
    const ar = new Layer(W, H);
    ar.ellipse(18, 30 + dy, 4, 6, COAT, { bias: -0.1 });
    ar.ellipse(20, 20 + dy, 3, 3, TOAD);
    out.draw(ink(ar), lean, 0);
  }
  const f = new Layer(W, H);
  const ey = 26 + dy + squash;
  eye(f, 25, ey, -1, blink, 3.8);
  eye(f, 39, ey, 1, blink, 3.8);
  if (mouth === "open") f.ellipse(32, ey + 8, 3.4, 2, ["k", "m", "n"]);
  else {
    f.line(28, ey + 7, 29, ey + 8, "k");
    f.line(29, ey + 8, 35, ey + 8, "k");
    f.line(35, ey + 8, 36, ey + 7, "k");
  }
  f.outline("k");
  out.draw(f, lean, 0);
  return out;
}
const cmAnims = animate(commandant, {
  idle: [{}, { dy: 1, scroll: 1 }, { dy: 1, blink: true, salute: 1, scroll: 0 }, { dy: 0, scroll: 1 }],
  attack: [{ dy: 1, squash: 2, scroll: -3, mouth: "open" }, { dy: -2, lean: 3, scroll: 6, mouth: "open", salute: 1 }, { lean: 1, scroll: 3, mouth: "open" }],
  hurt: [{ dy: 2, lean: -2, blink: true, mouth: "open", scroll: -2 }, { dy: 1, lean: -1, blink: true }],
});
emit("game/sprites/creatures/commandant.ts", { id: "commandant", name: "COMMANDANT", w: W, h: H, palette: CM_PAL, fps: FPS, anims: cmAnims, script: "theatre1", comment: "Command: an officer-toad holding a sealed order scroll; the request is an object that can be queued, logged, undone or retried." });
