/**
 * Draftling: the starter Patternling. A plump blueprint-blue critter with
 * sharpened-pencil ears, a graph-paper belly and a drafting-compass tail. It
 * embodies the idea of drawing the design before building it.
 * Original design, 64x64, front and back views, drawn procedurally so every
 * animation frame is a pose of the same body.
 */
import {
  PixelBuffer,
  clipBelow,
  fillDisc,
  fillEllipsoid,
  fillRect,
  outline,
  pencil,
  silhouette,
  stroke,
  type Ramp,
} from "./buffer";

export const SIZE = 64;
export const GROUND_Y = 60;

/** Palette indices; 0 is transparent. */
export const C = {
  outline: 1,
  white: 2,
  eye: 3,
  cheek: 4,
  mouth: 5,
  flash: 6,
} as const;

export const BLUE: Ramp = [7, 8, 9, 10];
export const PAPER: Ramp = [11, 12, 13, 14];
export const WOOD: Ramp = [15, 16, 17, 18];
export const GRAPHITE: Ramp = [19, 20, 21, 22];
export const STEEL: Ramp = [23, 24, 25, 26];
export const GRID_LINE = 27;

export const DRAFTLING_PALETTE: readonly string[] = [
  "", // 0 transparent
  "#08122b", // outline
  "#ffffff",
  "#0b1226", // eye
  "#f08a9b", // cheek
  "#5b1f33", // mouth
  "#fdfdff", // flash
  "#17307e", "#2552c9", "#4b86f2", "#9cc8ff", // blue
  "#a99d7c", "#cfc3a2", "#ece3c8", "#fbf7e8", // paper
  "#7d4e25", "#b9803d", "#e3ac59", "#f7d68c", // wood
  "#20242f", "#3a4050", "#59606f", "#7d8596", // graphite
  "#475160", "#74808f", "#a6b0bd", "#e3e9f1", // steel
  "#8fb3e8", // paper grid line
];

export type Eyes = "open" | "blink" | "squint" | "dead";
export type Mouth = "smile" | "open" | "flat" | "o";
export type Arms = "down" | "up" | "forward";
export type View = "front" | "back";

export interface Pose {
  dx: number;
  dy: number;
  /** Vertical scale about the ground (1 = rest). */
  sy: number;
  /** Horizontal scale about the body centre (1 = rest). */
  sx: number;
  earSwing: number;
  tailSwing: number;
  arms: Arms;
  eyes: Eyes;
  mouth: Mouth;
  /** All-white silhouette (hit flash). */
  flash: boolean;
  /** Rows below this y are clipped (sinking into the ground). */
  clipY: number;
}

export const REST: Pose = {
  dx: 0,
  dy: 0,
  sy: 1,
  sx: 1,
  earSwing: 0,
  tailSwing: 0,
  arms: "down",
  eyes: "open",
  mouth: "smile",
  flash: false,
  clipY: SIZE,
};

const CX = 32;

/** Draw one pose of the Draftling. */
export function drawDraftling(pose: Pose = REST, view: View = "front"): PixelBuffer {
  const b = new PixelBuffer(SIZE, SIZE);
  const X = (x: number) => CX + (x - CX) * pose.sx + pose.dx;
  const Y = (y: number) => GROUND_Y - (GROUND_Y - y) * pose.sy + pose.dy;
  const RX = (r: number) => r * pose.sx;
  const RY = (r: number) => r * pose.sy;
  const back = view === "back";

  // Compass tail (behind the body in front view, centred on the back otherwise).
  const hinge = back ? { x: 32, y: 49 } : { x: 47, y: 50 };
  const a1 = back ? 100 + pose.tailSwing : 28 + pose.tailSwing;
  const a2 = back ? 62 + pose.tailSwing : 66 + pose.tailSwing;
  const legLen = 15;
  for (const [ang, tip] of [[a1, true], [a2, false]] as const) {
    const r = (ang * Math.PI) / 180;
    const ex = hinge.x + Math.cos(r) * legLen;
    const ey = hinge.y - Math.sin(r) * legLen;
    stroke(b, X(hinge.x), Y(hinge.y), X(ex), Y(ey), 1.6, STEEL[1]);
    stroke(b, X(hinge.x) - 0.5, Y(hinge.y) - 0.5, X(ex) - 0.5, Y(ey) - 0.5, 0.7, STEEL[3]);
    if (tip) fillDisc(b, X(ex), Y(ey), 1.4, 1.4, GRAPHITE[0]);
  }
  fillEllipsoid(b, X(hinge.x), Y(hinge.y), RX(3), RY(3), STEEL);

  // Pencil ears behind the head.
  pencil(b, X(24), Y(16), -26 + pose.earSwing, 15 * pose.sy, 6, WOOD, GRAPHITE);
  pencil(b, X(40), Y(16), 26 - pose.earSwing, 15 * pose.sy, 6, WOOD, GRAPHITE);

  // Body, feet, belly paper.
  fillEllipsoid(b, X(32), Y(43), RX(15), RY(14), BLUE);
  fillEllipsoid(b, X(23), Y(58), RX(6.5), RY(3.2), BLUE);
  fillEllipsoid(b, X(41), Y(58), RX(6.5), RY(3.2), BLUE);
  if (!back) {
    fillEllipsoid(b, X(32), Y(45), RX(9), RY(9), PAPER);
    for (let gy = 38; gy <= 52; gy += 4)
      for (let gx = 24; gx <= 40; gx++)
        if (b.get(Math.round(X(gx)), Math.round(Y(gy))) !== 0 && b.get(Math.round(X(gx)), Math.round(Y(gy))) >= PAPER[0] && b.get(Math.round(X(gx)), Math.round(Y(gy))) <= PAPER[3])
          b.set(X(gx), Y(gy), GRID_LINE);
    for (let gx = 28; gx <= 36; gx += 4)
      for (let gy = 37; gy <= 53; gy++) {
        const v = b.get(Math.round(X(gx)), Math.round(Y(gy)));
        if (v >= PAPER[0] && v <= PAPER[3]) b.set(X(gx), Y(gy), GRID_LINE);
      }
  } else {
    // Rolled blueprint strapped to the back.
    fillRect(b, Math.round(X(21)), Math.round(Y(40)), Math.round(22 * pose.sx), Math.max(3, Math.round(7 * pose.sy)), PAPER[2]);
    fillRect(b, Math.round(X(21)), Math.round(Y(40)), Math.round(22 * pose.sx), 1, PAPER[3]);
    fillRect(b, Math.round(X(21)), Math.round(Y(40) + 6 * pose.sy), Math.round(22 * pose.sx), 1, PAPER[1]);
    fillDisc(b, X(21), Y(43.5), RX(2), RY(3.5), PAPER[1]);
    fillDisc(b, X(43), Y(43.5), RX(2), RY(3.5), PAPER[1]);
    fillRect(b, Math.round(X(30)), Math.round(Y(40)), 3, Math.max(3, Math.round(7 * pose.sy)), WOOD[1]);
  }

  // Arms.
  const arm = (side: -1 | 1) => {
    const sx = 32 + side * 16;
    if (pose.arms === "down") fillEllipsoid(b, X(sx), Y(44), RX(3.6), RY(6), BLUE);
    else if (pose.arms === "up") fillEllipsoid(b, X(sx + side * 1), Y(36), RX(3.6), RY(6.5), BLUE);
    else fillEllipsoid(b, X(sx + side * 3), Y(41), RX(6.5), RY(3.6), BLUE);
  };
  arm(-1);
  arm(1);

  // Head.
  fillEllipsoid(b, X(32), Y(24), RX(15), RY(13), BLUE);

  if (!back) {
    const eyeY = Y(24.5);
    for (const ex of [25.5, 38.5]) {
      const x = X(ex);
      if (pose.eyes === "open") {
        fillDisc(b, x, eyeY, RX(3.4), RY(4.2), C.white);
        fillDisc(b, x + 0.3, eyeY + 0.6, RX(2), RY(3), C.eye);
        b.set(x - 0.3, eyeY - 1, C.white);
      } else if (pose.eyes === "blink") {
        fillRect(b, Math.round(x - 3), Math.round(eyeY + 1), 6, 1, C.eye);
      } else if (pose.eyes === "squint") {
        const s = ex < 32 ? 1 : -1;
        stroke(b, x - 3 * s, eyeY - 2, x + 2 * s, eyeY + 0.5, 0.6, C.eye);
        stroke(b, x - 3 * s, eyeY + 3, x + 2 * s, eyeY + 0.5, 0.6, C.eye);
      } else {
        stroke(b, x - 2.5, eyeY - 2.5, x + 2.5, eyeY + 2.5, 0.6, C.eye);
        stroke(b, x - 2.5, eyeY + 2.5, x + 2.5, eyeY - 2.5, 0.6, C.eye);
      }
      fillDisc(b, X(ex + (ex < 32 ? -3 : 3)), Y(30), RX(2), RY(1.2), C.cheek);
    }
    const my = Y(30.5);
    if (pose.mouth === "smile") {
      stroke(b, X(29), my, X(32), my + 1.2, 0.5, C.mouth);
      stroke(b, X(32), my + 1.2, X(35), my, 0.5, C.mouth);
    } else if (pose.mouth === "open") fillDisc(b, X(32), my + 1.5, RX(3), RY(2.6), C.mouth);
    else if (pose.mouth === "o") fillDisc(b, X(32), my + 1.2, RX(1.6), RY(1.8), C.mouth);
    else fillRect(b, Math.round(X(30)), Math.round(my + 1), 5, 1, C.mouth);
  }

  clipBelow(b, pose.clipY);
  if (pose.flash) silhouette(b, C.flash);
  outline(b, C.outline);
  return b;
}
