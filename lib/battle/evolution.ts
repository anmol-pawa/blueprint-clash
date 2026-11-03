/**
 * The evolution scene timeline as a pure function of time, so the Pixi scene
 * only has to draw what this says (and the pacing is unit-tested).
 *
 * Beats: announce (creature breathes) -> morph (white silhouette flickers
 * between the old and new form, faster and faster, with a growing glow) ->
 * burst (full white, then the new form appears with rays) -> reveal (new form
 * idle, text) -> done.
 */
export type Beat = "announce" | "morph" | "burst" | "reveal";

export const EVOLUTION = {
  announce: 1.2,
  morph: 3.2,
  burst: 0.7,
  reveal: 1.6,
} as const;

export const EVOLUTION_TOTAL = EVOLUTION.announce + EVOLUTION.morph + EVOLUTION.burst + EVOLUTION.reveal;

export interface EvolutionFrame {
  beat: Beat;
  /** Which sprite is showing. */
  form: "from" | "to";
  /** 0 = natural colours, 1 = solid white silhouette. */
  white: number;
  /** Sprite scale multiplier (a small pulse during the morph). */
  pulse: number;
  /** 0..1 glow ring / ray strength. */
  glow: number;
  /** 0..1 progress of the expanding burst rays (0 outside the burst). */
  rays: number;
  done: boolean;
}

/** Flicker frequency (Hz) grows linearly from 2 to 14 across the morph. */
export function flickerPhase(k: number): number {
  // Integral of f(t) = 2 + 12k over k in [0, k] times morph seconds: a chirp.
  return EVOLUTION.morph * (2 * k + 6 * k * k);
}

export function evolutionFrame(t: number): EvolutionFrame {
  const time = Math.max(0, t);
  const a = EVOLUTION.announce;
  const m = a + EVOLUTION.morph;
  const b = m + EVOLUTION.burst;
  if (time < a) return { beat: "announce", form: "from", white: 0, pulse: 1, glow: 0, rays: 0, done: false };
  if (time < m) {
    const k = (time - a) / EVOLUTION.morph;
    const phase = flickerPhase(k);
    const odd = Math.floor(phase * 2) % 2 === 1;
    // White ramps up so the silhouette dominates near the end.
    const white = 0.55 + 0.45 * k;
    return {
      beat: "morph",
      form: odd ? "to" : "from",
      white,
      pulse: 1 + 0.06 * Math.sin(phase * Math.PI * 2),
      glow: k,
      rays: 0,
      done: false,
    };
  }
  if (time < b) {
    const k = (time - m) / EVOLUTION.burst;
    // Hold white for the first third, then fade the white off to reveal the new form.
    const white = k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65;
    return { beat: "burst", form: "to", white, pulse: 1 + 0.12 * (1 - k), glow: 1 - k * 0.5, rays: k, done: false };
  }
  const k = Math.min(1, (time - b) / EVOLUTION.reveal);
  return { beat: "reveal", form: "to", white: 0, pulse: 1, glow: 0.5 * (1 - k), rays: 0, done: time >= EVOLUTION_TOTAL };
}

/** Narration line for the current beat. */
export function evolutionText(beat: Beat, from: string, to: string): string {
  switch (beat) {
    case "announce":
      return `What? ${from} is changing!`;
    case "morph":
      return `${from} is changing!`;
    case "burst":
      return "...";
    case "reveal":
      return `${from} evolved into ${to}!`;
  }
}
