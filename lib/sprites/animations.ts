import type { PixelBuffer } from "./buffer";
import { REST, drawDraftling, GROUND_Y, type Pose, type View } from "./draftling";

export interface Animation {
  name: string;
  loop: boolean;
  /** Milliseconds each frame is shown. */
  frameMs: number;
  poses: readonly Pose[];
}

const p = (o: Partial<Pose>): Pose => ({ ...REST, ...o });

/** Breathing idle with a blink and ear/tail sway. */
const idle: Animation = {
  name: "idle",
  loop: true,
  frameMs: 220,
  poses: [
    p({}),
    p({ sy: 0.97, sx: 1.02, earSwing: 3, tailSwing: 4 }),
    p({ sy: 0.95, sx: 1.03, earSwing: 5, tailSwing: 8, eyes: "blink" }),
    p({ sy: 0.97, sx: 1.02, earSwing: 3, tailSwing: 4 }),
  ],
};

/** Crouch, lunge forward with raised arms, recover. */
const attack: Animation = {
  name: "attack",
  loop: false,
  frameMs: 90,
  poses: [
    p({ sy: 0.88, sx: 1.08, arms: "up", earSwing: -6, mouth: "flat" }),
    p({ dx: 9, dy: -3, sy: 1.06, sx: 0.96, arms: "forward", mouth: "open", earSwing: 10, tailSwing: -12 }),
    p({ dx: 13, dy: -1, sy: 1, arms: "forward", mouth: "open", earSwing: 8, tailSwing: -16 }),
    p({ dx: 5, sy: 0.96, arms: "down", earSwing: 2 }),
  ],
};

/** White flash, recoil, squint. */
const hurt: Animation = {
  name: "hurt",
  loop: false,
  frameMs: 110,
  poses: [
    p({ flash: true, dx: -4, sy: 0.94, sx: 1.04, eyes: "squint", mouth: "o" }),
    p({ dx: -7, sy: 0.9, sx: 1.07, eyes: "squint", mouth: "o", earSwing: -8, tailSwing: 14 }),
    p({ dx: -3, sy: 0.96, eyes: "squint", mouth: "flat", earSwing: -3 }),
  ],
};

/** Stagger, then sink into the ground. */
const faint: Animation = {
  name: "faint",
  loop: false,
  frameMs: 140,
  poses: [
    p({ dx: -3, sy: 0.92, sx: 1.05, eyes: "dead", mouth: "o", earSwing: -10 }),
    p({ dx: -3, dy: 4, sy: 0.82, sx: 1.12, eyes: "dead", mouth: "flat", earSwing: -22, tailSwing: 18 }),
    p({ dx: -3, dy: 12, sy: 0.7, sx: 1.18, eyes: "dead", mouth: "flat", earSwing: -34, tailSwing: 24, clipY: GROUND_Y + 1 }),
    p({ dx: -3, dy: 26, sy: 0.6, sx: 1.2, eyes: "dead", mouth: "flat", earSwing: -40, tailSwing: 28, clipY: GROUND_Y + 1 }),
  ],
};

export const DRAFTLING_ANIMATIONS: Readonly<Record<string, Animation>> = { idle, attack, hurt, faint };

export function drawFrame(anim: Animation, frame: number, view: View = "front"): PixelBuffer {
  const i = ((frame % anim.poses.length) + anim.poses.length) % anim.poses.length;
  return drawDraftling(anim.poses[i], view);
}
