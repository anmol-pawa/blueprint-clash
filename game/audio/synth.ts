"use client";
/**
 * All sound is synthesized with the Web Audio API: no audio files, no
 * licensing. The context starts on the first user gesture (browser policy).
 * Pattern data and settings parsing live in lib/audio (pure, tested).
 */
import { type AudioSettings, DEFAULT_AUDIO, type Theme, THEMES, midiToHz, parseAudioSettings, stepEvents, stepSeconds } from "@/lib/audio/themes";

const STORAGE_KEY = "blueprint-clash:audio";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let settings: AudioSettings = { ...DEFAULT_AUDIO };
let loaded = false;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let currentTheme: string | null = null;
const listeners = new Set<() => void>();

function load(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    settings = parseAudioSettings(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    settings = { ...DEFAULT_AUDIO };
  }
}

function save(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable: keep in memory */
  }
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    load();
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = settings.volume;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = settings.music ? 0.22 : 0;
    musicGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// --- settings (subscribed to by the toggle) -----------------------------------------------------

export function getAudioSettings(): AudioSettings {
  load();
  return settings;
}

export function subscribeAudio(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function changed(): void {
  save();
  if (master) master.gain.value = settings.volume;
  if (musicGain) musicGain.gain.value = settings.music ? 0.22 : 0;
  listeners.forEach((f) => f());
}

export function setVolume(v: number): void {
  load();
  settings = { ...settings, volume: Math.min(1, Math.max(0, v)) };
  changed();
}

export function setMusic(on: boolean): void {
  load();
  settings = { ...settings, music: on };
  changed();
  if (!on) stopTimer();
  else if (currentTheme) startMusic(currentTheme);
}

export function setSfx(on: boolean): void {
  load();
  settings = { ...settings, sfx: on };
  changed();
}

// --- voices -------------------------------------------------------------------------------------

function tone(freq: number, dur: number, o: { type?: OscillatorType; gain?: number; slide?: number; delay?: number; dest?: AudioNode } = {}): void {
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + (o.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t0);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * o.slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.2, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(o.dest ?? master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, o: { gain?: number; freq?: number; q?: number; delay?: number; sweep?: number; dest?: AudioNode } = {}): void {
  const c = ac();
  if (!c || !master || !noiseBuf) return;
  const t0 = c.currentTime + (o.delay ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(o.freq ?? 1200, t0);
  if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t0 + dur);
  f.Q.value = o.q ?? 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(o.gain ?? 0.3, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(o.dest ?? master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

function on(fn: () => void): () => void {
  return () => {
    load();
    if (settings.sfx) fn();
  };
}

export const sfx = {
  /** Call from a user gesture to start the audio context. */
  unlock(): void {
    ac();
  },
  click: on(() => tone(880, 0.06, { type: "square", gain: 0.05 })),
  select: on(() => tone(1100, 0.04, { type: "square", gain: 0.035 })),
  /** Dialogue text blip. */
  blip: on(() => tone(520 + Math.random() * 120, 0.03, { type: "square", gain: 0.02 })),
  step: on(() => noise(0.04, { gain: 0.03, freq: 300 })),
  correct: on(() => {
    tone(784, 0.1, { type: "triangle", gain: 0.1 });
    tone(1175, 0.18, { type: "triangle", gain: 0.1, delay: 0.08 });
  }),
  wrong: on(() => {
    tone(220, 0.14, { type: "square", gain: 0.08 });
    tone(165, 0.22, { type: "square", gain: 0.08, delay: 0.12 });
  }),
  /** The player's strike lands. */
  hit: on(() => {
    tone(90, 0.35, { type: "sine", gain: 0.45, slide: 0.4 });
    noise(0.22, { gain: 0.3, freq: 900, sweep: 150 });
    tone(1320, 0.12, { type: "triangle", gain: 0.06, slide: 0.6, delay: 0.02 });
  }),
  /** The player takes damage. */
  hurt: on(() => {
    tone(160, 0.3, { type: "square", gain: 0.12, slide: 0.35 });
    noise(0.2, { gain: 0.25, freq: 600, sweep: 120 });
  }),
  faint: on(() => {
    tone(330, 0.7, { type: "triangle", gain: 0.1, slide: 0.25 });
    noise(0.5, { gain: 0.08, freq: 1500, sweep: 200 });
  }),
  victory: on(() => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, { type: "triangle", gain: 0.12, delay: i * 0.12 }));
    tone(1047, 1.2, { type: "sine", gain: 0.08, delay: 0.5 });
  }),
  defeat: on(() => {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.5, { type: "sawtooth", gain: 0.06, delay: i * 0.2 }));
  }),
  /** All tests pass. */
  judgePass: on(() => {
    [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.2, { type: "square", gain: 0.05, delay: i * 0.07 }));
  }),
  judgeFail: on(() => {
    tone(300, 0.15, { type: "sawtooth", gain: 0.06, slide: 0.7 });
    tone(200, 0.3, { type: "sawtooth", gain: 0.06, slide: 0.6, delay: 0.14 });
  }),
  /** Badge fanfare. */
  badge: on(() => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.28, { type: "square", gain: 0.06, delay: i * 0.1 }));
    tone(1047, 1.4, { type: "sine", gain: 0.08, delay: 0.55 });
    tone(1568, 1.4, { type: "sine", gain: 0.05, delay: 0.55 });
  }),
  /** A rising whole-tone shimmer while the creature glows white. */
  evolving: on(() => {
    [392, 440, 494, 554, 622, 698, 784, 880].forEach((f, i) => tone(f, 0.18, { type: "triangle", gain: 0.06, delay: i * 0.22 }));
  }),
  /** The reveal: a bright major arpeggio over a held fifth. */
  evolved: on(() => {
    [587, 740, 880, 1175].forEach((f, i) => tone(f, 0.3, { type: "square", gain: 0.05, delay: i * 0.09 }));
    tone(880, 1.0, { type: "sine", gain: 0.07, delay: 0.36 });
    tone(1319, 1.0, { type: "sine", gain: 0.05, delay: 0.36 });
  }),
};

// --- music --------------------------------------------------------------------------------------

function stopTimer(): void {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

/** Start (or switch to) a theme. Safe to call repeatedly; the same theme keeps playing. */
export function startMusic(themeId: string): void {
  const theme: Theme | undefined = THEMES[themeId];
  if (!theme) return;
  load();
  if (currentTheme === themeId && musicTimer) return;
  stopTimer();
  currentTheme = themeId;
  if (!settings.music) return;
  const c = ac();
  if (!c || !musicGain) return;
  const dur = stepSeconds(theme);
  let step = 0;
  let next = c.currentTime + 0.08;
  const pump = () => {
    if (!ctx || !musicGain) return;
    if (ctx.state !== "running") {
      next = ctx.currentTime + 0.08; // do not queue a burst after the context resumes
      return;
    }
    while (next < ctx.currentTime + 0.25) {
      const e = stepEvents(theme, step);
      const delay = Math.max(0, next - ctx.currentTime);
      if (e.bass !== null) tone(midiToHz(e.bass), dur * 3.6, { type: "triangle", gain: 0.2, delay, dest: musicGain });
      if (e.lead !== null) tone(midiToHz(e.lead), dur * 1.6, { type: "square", gain: 0.05, delay, dest: musicGain });
      if (e.drum === 1) noise(0.03, { gain: 0.04, freq: 8000, delay, dest: musicGain });
      else if (e.drum === 2) noise(0.12, { gain: 0.1, freq: 1800, delay, dest: musicGain });
      step++;
      next += dur;
    }
  };
  musicTimer = setInterval(pump, 60);
  pump();
}

export function stopMusic(): void {
  stopTimer();
  currentTheme = null;
}
