// Spaced repetition and mastery (GDD §6). Pure: no DOM, no storage. Cards live in `SaveData.srs`.
import type { SrsCard } from "../save/schema";

export const DAY_MS = 86_400_000;
const RELEARN_MS = 10 * 60_000;
export const MIN_EASE = 1.3;
export const MAX_EASE = 2.8;

export type MasteryState = "unseen" | "seen" | "learning" | "practiced" | "mastered" | "ingrained";
export const MASTERY_ORDER: readonly MasteryState[] = ["unseen", "seen", "learning", "practiced", "mastered", "ingrained"];

export function newSrsCard(now: number): SrsCard {
  return { due: now, intervalDays: 0, ease: 2.3, reps: 0, lapses: 0 };
}

/**
 * Applies one answer (SM-2 flavoured). Correct: intervals 1 day, 3 days, then x ease. Wrong: reps reset, a lapse is
 * counted, ease drops, and the card returns in 10 minutes. `assisted` (reference or hint viewed) never advances
 * mastery: the card is returned unchanged, except that a wrong assisted answer still counts as a lapse.
 */
export function reviewCard(card: SrsCard | undefined, correct: boolean, now: number, assisted = false): SrsCard {
  const c = card ?? newSrsCard(now);
  if (!correct) {
    return { due: now + RELEARN_MS, intervalDays: 0, ease: Math.max(MIN_EASE, +(c.ease - 0.2).toFixed(2)), reps: 0, lapses: c.lapses + 1 };
  }
  if (assisted) return { ...c };
  const reps = c.reps + 1;
  const intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.max(c.intervalDays + 1, Math.round(c.intervalDays * c.ease));
  return { due: now + intervalDays * DAY_MS, intervalDays, ease: Math.min(MAX_EASE, +(c.ease + 0.05).toFixed(2)), reps, lapses: c.lapses };
}

/** Seen (answered wrong, relearning) → Learning (1-2 successes) → Practiced (3+) → Mastered (21+ days) → Ingrained (60+ days). */
export function masteryState(card: SrsCard | undefined): MasteryState {
  if (!card) return "unseen";
  if (card.reps === 0) return "seen";
  if (card.intervalDays >= 60) return "ingrained";
  if (card.intervalDays >= 21) return "mastered";
  if (card.reps >= 3) return "practiced";
  return "learning";
}

/** 0 = fresh, 1 = dusty (a quarter of its interval overdue), 2 = rusty (a full interval overdue). Never-passed cards have no rust. */
export function rustLevel(card: SrsCard | undefined, now: number): 0 | 1 | 2 {
  if (!card || card.reps === 0 || now <= card.due) return 0;
  const ratio = (now - card.due) / (Math.max(1, card.intervalDays) * DAY_MS);
  return ratio >= 1 ? 2 : ratio >= 0.25 ? 1 : 0;
}

export interface QueueOptions {
  max: number;
  /** Cap on never-seen cards so a first session is not a wall of new material. */
  maxNew: number;
}

/** Due cards first (most overdue first), then never-seen ids in deck order up to `maxNew`, capped at `max` in total. */
export function buildQueue(srs: Readonly<Record<string, SrsCard>>, deckIds: readonly string[], now: number, opts: QueueOptions = { max: 10, maxNew: 4 }): string[] {
  const due = deckIds
    .filter((id) => srs[id] && srs[id].due <= now)
    .sort((a, b) => srs[a].due - srs[b].due);
  const fresh = deckIds.filter((id) => !srs[id]).slice(0, opts.maxNew);
  return [...due, ...fresh].slice(0, opts.max);
}

export function dueCount(srs: Readonly<Record<string, SrsCard>>, now: number): number {
  return Object.values(srs).filter((c) => c.due <= now).length;
}

/** Mutating helper for `updateSave`: records one answer for a card id. */
export function recordAnswer(srs: Record<string, SrsCard>, id: string, correct: boolean, now: number, assisted = false): void {
  srs[id] = reviewCard(srs[id], correct, now, assisted);
}
