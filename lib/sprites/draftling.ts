import { Canvas, dissolve, silhouette, sinkInto, type Frame, type Ramp } from "./raster";

/**
 * Draftling: the starter Patternling. A round blue blueprint-sheet body with a gridded
 * belly, pencils for ears, a ruler tail and drafting-compass legs. It "reads" as a
 * draftsman's sketch that is about to become a real design.
 */

export const DRAFTLING_PALETTE: readonly string[] = [
  "#000000", // 0 transparent (unused colour)
  "#1b2340", // 1 outline / ink
  "#23478a", // 2 blue dark
  "#2f6bd0", // 3 blue mid
  "#5b9bf0", // 4 blue light
  "#a6d0ff", // 5 blue highlight
  "#b9a98a", // 6 paper shadow
  "#e0d3b4", // 7 paper mid
  "#f6eed8", // 8 paper light
  "#c98a12", // 9 pencil dark
  "#f2b630", // 10 pencil mid
  "#ffe07a", // 11 pencil light
  "#d9667a", // 12 eraser / tongue
  "#f2a0ae", // 13 cheek pink
  "#4a4f5e", // 14 graphite / metal dark
  "#8b92a6", // 15 metal light
  "#ffffff", // 16 white
];

const INK = 1;
const BLUE: Ramp = [2, 3, 4, 5];
const PAPER: Ramp = [6, 7, 8];
const WHITE = 16;
const SIZE = 64;
const GROUND = 61;

export type Eyes = "open" | "blink" | "hurt" | "happy" | "closed";
export type Mouth = "closed" | "open" | "grit";

export interface DraftlingPose {
  bob: number; // pixels the body rises (negative = down)
  squash: number; // 0 neutral, >0 squashed, <0 stretched
  lunge: number; // horizontal shift
  earL: number; // radians added to the ear tilt
  earR: number;
  tail: number; // radians
  armL: number; // vertical arm offset in pixels
  armR: number;
  eyes: Eyes;
  mouth: Mouth;
}

export const REST: DraftlingPose = {
  bob: 0,
  squash: 0,
  lunge: 0,
  earL: 0,
  earR: 0,
  tail: 0,
  armL: 0,
  armR: 0,
  eyes: "open",
  mouth: "closed",
};

function pencil(c: Canvas, bx: number, by: number, tilt: number): void {
  const len = 13;
  const tx = bx + Math.sin(tilt) * len;
  const ty = by - Math.cos(tilt) * len;
  c.bar(bx, by, tx, ty, 6, (u, v) => {
    if (u < 0.13) return 12; // eraser
    if (u < 0.2) return v < 0 ? 15 : 14; // ferrule
    if (u > 0.93) return 14; // graphite tip
    if (u > 0.76) return v < -0.2 ? 8 : 7; // sharpened wood
    return v < -0.35 ? 11 : v > 0.4 ? 9 : 10;
  });
}

function compassLeg(c: Canvas, hx: number, hy: number, fx: number, fy: number): void {
  c.bar(hx, hy, fx, fy, 3, (u, v) => (u > 0.9 ? 14 : v < 0 ? 15 : 14));
  c.flatEllipse(hx, hy, 2, 2, 15);
}

function ruler(c: Canvas, x0: number, y0: number, angle: number, len: number): void {
  const x1 = x0 + Math.cos(angle) * len;
  const y1 = y0 + Math.sin(angle) * len;
  c.bar(x0, y0, x1, y1, 5, (u, v) => {
    if (v > 0.3 && Math.floor(u * len) % 3 === 0) return 6; // tick marks
    return v < -0.4 ? 8 : v > 0.5 ? 6 : 7;
  });
}

function face(c: Canvas, cx: number, cy: number, p: DraftlingPose): void {
  for (const side of [-1, 1]) {
    const ex = cx + side * 6;
    const ey = cy + 1;
    if (p.eyes === "open") {
      c.flatEllipse(ex, ey, 4, 4.5, WHITE);
      c.flatEllipse(ex + side * 0.5, ey + 0.5, 2.2, 3, INK);
      c.set(ex - 0.5, ey - 1, WHITE);
    } else if (p.eyes === "blink" || p.eyes === "closed") {
      for (let i = -3; i <= 3; i++) c.set(ex + i, ey + (p.eyes === "closed" ? 1 - Math.abs(i) / 3 : 1), INK);
    } else if (p.eyes === "happy") {
      for (let i = -3; i <= 3; i++) c.set(ex + i, ey + 1 - Math.round(2 - Math.abs(i) * 0.7), INK);
    } else {
      // hurt: ">" and "<"
      for (let i = 0; i < 4; i++) {
        c.set(ex - side * (3 - i), ey - 3 + i, INK);
        c.set(ex - side * (3 - i), ey + 3 - i, INK);
      }
    }
    c.flatEllipse(cx + side * 11, cy + 6, 2, 1.4, 13);
  }
  const my = cy + 8;
  if (p.mouth === "closed") {
    for (const i of [-2, -1, 0, 1, 2]) c.set(cx + i, my + (Math.abs(i) === 2 ? -1 : 0), INK);
  } else if (p.mouth === "open") {
    c.flatEllipse(cx, my + 1, 3.5, 3, INK);
    c.flatEllipse(cx, my + 2.2, 2, 1.2, 12);
  } else {
    for (let i = -3; i <= 3; i++) c.set(cx + i, my + (i % 2 ? 0 : 1), INK);
  }
  // registration mark between the ears
  for (const [dx, dy] of [[0, -8], [-1, -8], [1, -8], [0, -9], [0, -7]]) c.set(cx + dx, cy + dy, 8);
}

export function drawDraftling(p: DraftlingPose, view: "front" | "back"): Frame {
  const c = new Canvas(SIZE, SIZE);
  const cx = 32 + p.lunge;
  const s = p.squash;
  const bodyRy = 11.5 * (1 - s);
  const bodyRx = 14 * (1 + s * 0.5);
  const bodyCy = GROUND - 8 - bodyRy + p.bob;
  const headRy = 12 * (1 - s * 0.4);
  const headRx = 16 * (1 + s * 0.25);
  const headCy = bodyCy - bodyRy * 0.95 - headRy * 0.35;
  const earY = headCy - headRy * 0.72;

  // back layer: tail, ears, legs
  const tailBase = view === "front" ? [cx + bodyRx - 3, bodyCy + 3] : [cx + 1, bodyCy + bodyRy - 2];
  ruler(c, tailBase[0], tailBase[1], view === "front" ? -0.7 + p.tail : -1.25 + p.tail, 16);
  pencil(c, cx - 9, earY, -0.35 + p.earL);
  pencil(c, cx + 9, earY, 0.35 + p.earR);
  const hipY = bodyCy + bodyRy - 2;
  compassLeg(c, cx - 7, hipY, cx - 11, GROUND - 1);
  compassLeg(c, cx + 7, hipY, cx + 11, GROUND - 1);
  c.flatEllipse(cx - 11, GROUND - 1.5, 2.5, 1.5, 14);
  c.flatEllipse(cx + 11, GROUND - 1.5, 2.5, 1.5, 14);

  // body, belly / scroll
  c.ellipse(cx, bodyCy, bodyRx, bodyRy, BLUE);
  if (view === "front") {
    c.ellipse(cx, bodyCy + 1.5, bodyRx * 0.62, bodyRy * 0.72, PAPER, {
      recolor: (x, y, shaded) => (x % 4 === 0 || y % 4 === 0 ? (shaded === 6 ? 3 : 4) : shaded),
    });
  } else {
    c.bar(cx - bodyRx * 0.75, bodyCy - 3, cx + bodyRx * 0.75, bodyCy + 4, 8, (u, v) =>
      u < 0.07 || u > 0.93 ? 2 : v < -0.45 ? 8 : v > 0.45 ? 6 : 7,
    );
    c.flatEllipse(cx - bodyRx * 0.75, bodyCy - 3, 2.5, 4, 3);
    c.flatEllipse(cx + bodyRx * 0.75, bodyCy + 4, 2.5, 4, 2);
  }

  // head
  c.ellipse(cx, headCy, headRx, headRy, BLUE);
  if (view === "front") face(c, cx, headCy, p);

  // arms (front layer)
  c.ellipse(cx - bodyRx - 1, bodyCy - 1 + p.armL, 3.5, 5, BLUE);
  c.ellipse(cx + bodyRx + 1, bodyCy - 1 + p.armR, 3.5, 5, BLUE);

  c.outline(INK);
  return c.toFrame();
}

function pose(over: Partial<DraftlingPose>): DraftlingPose {
  return { ...REST, ...over };
}

export const DRAFTLING_ANIMATIONS = {
  idle: [
    pose({}),
    pose({ bob: 1, squash: 0.06, earL: 0.05, earR: -0.05, tail: 0.15, armL: 1, armR: 1 }),
    pose({ bob: 0, tail: 0.3, earL: 0.1, earR: -0.1 }),
    pose({ bob: 1, squash: 0.06, tail: 0.15, eyes: "blink", armL: 1, armR: 1 }),
  ],
  attack: [
    pose({ squash: 0.22, lunge: -3, earL: -0.2, earR: 0.2, armL: 3, armR: 3, mouth: "grit" }),
    pose({ squash: -0.05, lunge: 6, earL: 0.35, earR: 0.5, armL: -3, armR: -4, tail: -0.4, mouth: "open" }),
    pose({ squash: 0, lunge: 7, earL: 0.4, earR: 0.5, armL: -2, armR: -3, tail: -0.3, mouth: "open" }),
    pose({ squash: 0.05, lunge: 2, armL: 1, armR: 1, mouth: "closed" }),
  ],
  hurt: [
    pose({ squash: 0.12, lunge: -4, earL: -0.3, earR: 0.3, eyes: "hurt", mouth: "open", armL: -3, armR: -3 }),
    pose({ squash: 0.1, lunge: -3, earL: -0.25, earR: 0.25, eyes: "hurt", mouth: "grit", armL: -2, armR: -2 }),
    pose({ squash: 0.04, lunge: -1, eyes: "hurt", mouth: "grit" }),
  ],
  faint: [
    pose({ squash: 0.1, earL: -0.2, earR: 0.2, eyes: "hurt", mouth: "open" }),
    pose({ squash: 0.2, earL: -0.5, earR: 0.5, eyes: "closed", armL: 4, armR: 4, tail: 0.4 }),
    pose({ squash: 0.3, earL: -0.7, earR: 0.7, eyes: "closed", armL: 5, armR: 5, tail: 0.6 }),
    pose({ squash: 0.35, earL: -0.8, earR: 0.8, eyes: "closed", armL: 6, armR: 6, tail: 0.7 }),
  ],
} as const;

export type DraftlingAnim = keyof typeof DRAFTLING_ANIMATIONS | "evolve";

/** Render every frame of an animation. Post-effects (flash, sink, dissolve) match the pose index. */
export function draftlingFrames(anim: DraftlingAnim, view: "front" | "back"): Frame[] {
  if (anim === "evolve") {
    const base = drawDraftling(REST, view);
    return [
      base,
      silhouette(drawDraftling(pose({ squash: 0.15 }), view), WHITE),
      silhouette(drawDraftling(pose({ squash: -0.1, bob: 0 }), view), WHITE),
      silhouette(drawDraftling(pose({ squash: -0.14, bob: 1 }), view), WHITE),
      silhouette(drawDraftling(pose({ squash: -0.1, bob: 0 }), view), WHITE),
    ];
  }
  const frames = DRAFTLING_ANIMATIONS[anim].map((p) => drawDraftling(p, view));
  if (anim === "hurt") frames[0] = silhouette(frames[0], WHITE);
  if (anim === "faint") {
    return frames.map((f, i) => dissolve(sinkInto(f, i * 3, GROUND + 1), i === 3 ? 0.7 : i * 0.18));
  }
  return frames;
}
