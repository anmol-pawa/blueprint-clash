/**
 * Pure music data for the chiptune sequencer. No WebAudio here, so the
 * patterns and the note maths can be unit-tested.
 */

export interface Theme {
  id: string;
  /** Tempo in beats per minute; one step is an eighth note. */
  bpm: number;
  /** MIDI note of the tonic (bass plays an octave below the lead). */
  rootMidi: number;
  /** Scale degrees as semitone offsets from the tonic. */
  scale: readonly number[];
  /** Bass root per bar, in semitones from the tonic. */
  bass: readonly number[];
  /** Eighth-note steps per bar. */
  stepsPerBar: number;
  /** Lead melody as indexes into `scale`; null is a rest. One entry per step of a full cycle (bass.length bars). */
  lead: readonly (number | null)[];
}

export interface StepEvents {
  /** Bass note (MIDI) to start on this step, or null. */
  bass: number | null;
  /** Lead note (MIDI) to start on this step, or null. */
  lead: number | null;
  /** 0 none, 1 closed hat, 2 snare. */
  drum: 0 | 1 | 2;
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const OLD_TOWN_SCALE = [0, 2, 4, 7, 9, 12] as const; // major pentatonic plus the octave

/**
 * Old Town: a calm, slightly wistful major-key loop for a gatekeeper's
 * quarter. I-vi-IV-V bass, a lilting pentatonic lead, light percussion.
 */
export const OLD_TOWN: Theme = {
  id: "old-town",
  bpm: 96,
  rootMidi: 60, // C4
  scale: OLD_TOWN_SCALE,
  bass: [0, -3, -7, -5],
  stepsPerBar: 8,
  lead: [
    2, null, 3, null, 4, 3, 2, null, //
    1, null, 2, null, 3, 2, 1, null, //
    0, null, 1, null, 2, 1, 0, null, //
    1, 2, 3, null, 2, null, 1, null,
  ],
};

/** A tenser variant for boss fights: minor, faster, driving eighths. */
export const WARDEN_FIGHT: Theme = {
  id: "warden-fight",
  bpm: 132,
  rootMidi: 57, // A3
  scale: [0, 3, 5, 7, 10, 12],
  bass: [0, 0, -4, -2],
  stepsPerBar: 8,
  lead: [
    3, null, 3, 4, 3, null, 2, null, //
    3, null, 3, 4, 5, null, 4, null, //
    2, null, 2, 3, 2, null, 1, null, //
    2, 3, 4, null, 3, null, 2, 1,
  ],
};

export const THEMES: Record<string, Theme> = { [OLD_TOWN.id]: OLD_TOWN, [WARDEN_FIGHT.id]: WARDEN_FIGHT };

export function stepSeconds(t: Theme): number {
  return 60 / t.bpm / 2;
}

/** Length of the whole loop in steps. */
export function cycleSteps(t: Theme): number {
  return t.bass.length * t.stepsPerBar;
}

/** What starts on the given (ever-increasing) step. Deterministic and loops forever. */
export function stepEvents(t: Theme, step: number): StepEvents {
  const n = cycleSteps(t);
  const s = ((step % n) + n) % n;
  const bar = Math.floor(s / t.stepsPerBar);
  const inBar = s % t.stepsPerBar;
  const barRoot = t.bass[bar]!;
  const degree = t.lead[s % t.lead.length] ?? null;
  return {
    bass: inBar === 0 || inBar === 4 ? t.rootMidi - 12 + barRoot : null,
    lead: degree === null ? null : t.rootMidi + 12 + barRoot + t.scale[degree]!,
    drum: inBar === 4 ? 2 : inBar % 2 === 0 ? 1 : 0,
  };
}

export interface AudioSettings {
  /** Master volume 0..1. */
  volume: number;
  music: boolean;
  sfx: boolean;
}

export const DEFAULT_AUDIO: AudioSettings = { volume: 0.6, music: true, sfx: true };

/** Tolerant parse: any bad or missing field falls back to the default. */
export function parseAudioSettings(raw: string | null | undefined): AudioSettings {
  if (!raw) return { ...DEFAULT_AUDIO };
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const v = typeof o.volume === "number" && Number.isFinite(o.volume) ? Math.min(1, Math.max(0, o.volume)) : DEFAULT_AUDIO.volume;
    return {
      volume: v,
      music: typeof o.music === "boolean" ? o.music : DEFAULT_AUDIO.music,
      sfx: typeof o.sfx === "boolean" ? o.sfx : DEFAULT_AUDIO.sfx,
    };
  } catch {
    return { ...DEFAULT_AUDIO };
  }
}
