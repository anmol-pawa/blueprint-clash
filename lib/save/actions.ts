import type { SaveData, Settings } from "./types";

/** Pure updaters: each returns a new save with `updatedAt` bumped. */
export function recordCompletion(save: SaveData, id: string, score: number, assisted: boolean, now: number): SaveData {
  const prev = save.completions[id];
  const s = Math.min(100, Math.max(0, score));
  // Assisted only if every completion so far was assisted: an unaided pass clears the flag.
  const wasAssisted = prev ? prev.assisted && assisted : assisted;
  return {
    ...save,
    updatedAt: now,
    completions: {
      ...save.completions,
      [id]: { bestScore: Math.max(prev?.bestScore ?? 0, s), assisted: wasAssisted, completedAt: prev?.completedAt ?? now },
    },
  };
}

export function awardBadge(save: SaveData, badge: string, now: number): SaveData {
  return save.badges.includes(badge) ? save : { ...save, updatedAt: now, badges: [...save.badges, badge] };
}

/** Bits never go negative; spending more than the balance is rejected by returning `null`. */
export function adjustBits(save: SaveData, delta: number, now: number): SaveData | null {
  const bits = save.bits + Math.trunc(delta);
  return bits < 0 ? null : { ...save, updatedAt: now, bits };
}

export function updateSettings(save: SaveData, patch: Partial<Settings>, now: number): SaveData {
  return { ...save, updatedAt: now, settings: { ...save.settings, ...patch } };
}
