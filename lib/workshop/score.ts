import type { ClarifyQuestion, PhaseId } from "./types";
import type { FlowState, PhaseResult } from "./flow";
import { ocpScore, type OcpResult } from "./ocp";
import type { WorkshopFile } from "./types";

export interface ClarifyScore {
  score: number;
  essentialAsked: number;
  essentialTotal: number;
  noiseAsked: number;
  missedEssential: string[];
}

/** 80 % essential coverage, 20 % useful coverage, minus 0.1 per noise question (shotgunning is not clarifying). */
export function clarifyScore(questions: ClarifyQuestion[], asked: string[]): ClarifyScore {
  const by = (q: ClarifyQuestion["quality"]) => questions.filter((x) => x.quality === q);
  const hit = (list: ClarifyQuestion[]) => list.filter((x) => asked.includes(x.id)).length;
  const essential = by("essential");
  const useful = by("useful");
  const noiseAsked = hit(by("noise"));
  const frac = (n: number, d: number) => (d === 0 ? 1 : n / d);
  const raw = 0.8 * frac(hit(essential), essential.length) + 0.2 * frac(hit(useful), useful.length) - 0.1 * noiseAsked;
  return {
    score: Math.min(1, Math.max(0, raw)),
    essentialAsked: hit(essential),
    essentialTotal: essential.length,
    noiseAsked,
    missedEssential: essential.filter((q) => !asked.includes(q.id)).map((q) => q.id),
  };
}

export const WEIGHTS = { tests: 0.4, storms: 0.2, board: 0.15, review: 0.15, time: 0.1 } as const;

export interface StormOutcome {
  phase: PhaseId;
  tests: PhaseResult | null;
  ocp: OcpResult | null;
}

export interface ScoreInput {
  flow: FlowState;
  parMinutes: number;
  /** 0..1, absent until the design board exists (renormalised away). */
  boardScore?: number | null;
  /** Blocker + major findings, absent until Senior Review has run. */
  reviewBlockingFindings?: number | null;
  /** 0..1, absent until Senior Review has run. */
  reviewScore?: number | null;
}

export interface WorkshopScore {
  total: number;
  /** true when board or review components were missing and the others were renormalised. */
  partial: boolean;
  parts: { tests: number; storms: number; board: number | null; review: number | null; time: number };
  stormOutcomes: StormOutcome[];
  meanOcp: number | null;
  stars: 0 | 1 | 2 | 3;
  starThreePending: boolean;
}

const frac = (r: PhaseResult | null): number => (!r || r.total === 0 ? 0 : r.passed / r.total);

/** Full marks within par, linearly to zero at twice par. */
export function timeScore(elapsedMinutes: number, parMinutes: number): number {
  if (elapsedMinutes <= parMinutes) return 1;
  return Math.max(0, 1 - (elapsedMinutes - parMinutes) / parMinutes);
}

/** Each storm is compared with the design the player locked in just before it. */
export function stormOutcomes(flow: FlowState): StormOutcome[] {
  const out: StormOutcome[] = [];
  flow.phases.forEach((phase, i) => {
    if (i === 0) return;
    const rec = flow.records[phase];
    const prev: WorkshopFile[] | null = flow.records[flow.phases[i - 1]].snapshot;
    out.push({ phase, tests: rec.best, ocp: prev && rec.snapshot ? ocpScore(prev, rec.snapshot) : null });
  });
  return out;
}

export function workshopScore(input: ScoreInput): WorkshopScore {
  const { flow } = input;
  const base = flow.records[flow.phases[0]].best;
  const storms = stormOutcomes(flow);
  const stormValue = storms.length === 0 ? 0 : storms.reduce((s, o) => s + (frac(o.tests) + (o.ocp?.score ?? 0)) / 2, 0) / storms.length;
  const ocps = storms.map((o) => o.ocp?.score).filter((x): x is number => x !== undefined);
  const meanOcp = ocps.length === 0 ? null : ocps.reduce((a, b) => a + b, 0) / ocps.length;
  const elapsedMin = flow.startedAtMs !== null && flow.endedAtMs !== null ? (flow.endedAtMs - flow.startedAtMs) / 60000 : 0;
  const time = timeScore(elapsedMin, input.parMinutes);
  const board = input.boardScore ?? null;
  const review = input.reviewScore ?? null;

  const parts = { tests: frac(base), storms: stormValue, board, review, time };
  let sum = 0;
  let weight = 0;
  for (const k of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
    const v = parts[k];
    if (v !== null) {
      sum += WEIGHTS[k] * v;
      weight += WEIGHTS[k];
    }
  }

  const baseAll = !!base && base.total > 0 && base.passed === base.total;
  const stormsAll = storms.every((o) => !!o.tests && o.tests.total > 0 && o.tests.passed === o.tests.total);
  const reviewed = input.reviewBlockingFindings !== undefined && input.reviewBlockingFindings !== null;
  const surviving = baseAll && stormsAll && flow.stage === "debrief";
  const wantsThree = surviving && meanOcp !== null && meanOcp >= 0.7 && (!reviewed || input.reviewBlockingFindings === 0);
  const stars: 0 | 1 | 2 | 3 = wantsThree && reviewed ? 3 : surviving ? 2 : baseAll ? 1 : 0;
  return {
    total: weight === 0 ? 0 : sum / weight,
    partial: board === null || review === null,
    parts,
    stormOutcomes: storms,
    meanOcp,
    stars,
    starThreePending: wantsThree && !reviewed,
  };
}
