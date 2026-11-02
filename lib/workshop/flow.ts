import type { ClarifyQuestion, PhaseId, Requirement, WorkshopFile } from "./types";
import { PHASE_ORDER } from "./types";

/** Phases a package plays, in order: those that have tests. */
export function phasesOf(tests: Partial<Record<PhaseId, unknown>>): PhaseId[] {
  return PHASE_ORDER.filter((p) => tests[p] !== undefined);
}

export type Stage = "brief" | "clarify" | "code" | "storm" | "debrief";

export interface PhaseResult {
  passed: number;
  total: number;
}

export interface PhaseRecord {
  phase: PhaseId;
  attempts: number;
  best: PhaseResult | null;
  /** The files at the moment the player locked the phase in (input to the next phase's OCP diff). */
  snapshot: WorkshopFile[] | null;
  lockedAtMs: number | null;
}

export interface FlowState {
  stage: Stage;
  /** The phase being coded, or the storm that just arrived. */
  phase: PhaseId;
  phases: PhaseId[];
  asked: string[];
  records: Record<string, PhaseRecord>;
  startedAtMs: number | null;
  endedAtMs: number | null;
}

export type FlowEvent =
  | { type: "START"; nowMs: number }
  | { type: "ASK"; questionId: string }
  | { type: "BEGIN_CODING" }
  | { type: "SUBMIT"; result: PhaseResult }
  | { type: "LOCK"; files: WorkshopFile[]; nowMs: number }
  | { type: "ACCEPT_STORM" };

export function initialFlow(phases: PhaseId[]): FlowState {
  if (phases.length === 0 || phases[0] !== "base") throw new Error("a Workshop starts with the base phase");
  return {
    stage: "brief",
    phase: "base",
    phases,
    asked: [],
    records: Object.fromEntries(phases.map((p) => [p, { phase: p, attempts: 0, best: null, snapshot: null, lockedAtMs: null }])),
    startedAtMs: null,
    endedAtMs: null,
  };
}

const ratio = (r: PhaseResult): number => (r.total === 0 ? 0 : r.passed / r.total);

/**
 * Pure reducer. Illegal events (wrong stage, unknown question, locking before any submit) return the same state
 * object, so the UI can dispatch freely and the tests can assert "nothing happened".
 *   brief -START-> clarify -BEGIN_CODING-> code(base) -SUBMIT*-> -LOCK-> storm(n) -ACCEPT_STORM-> code(n) ... -LOCK-> debrief
 * Clarifying is only possible before coding starts: a real interviewer will not re-brief you at minute 40.
 */
export function reduceFlow(s: FlowState, e: FlowEvent, questions: ClarifyQuestion[] = []): FlowState {
  switch (e.type) {
    case "START":
      return s.stage === "brief" && s.startedAtMs === null ? { ...s, stage: "clarify", startedAtMs: e.nowMs } : s;
    case "ASK":
      if (s.stage !== "clarify" || s.asked.includes(e.questionId)) return s;
      if (questions.length > 0 && !questions.some((q) => q.id === e.questionId)) return s;
      return { ...s, asked: [...s.asked, e.questionId] };
    case "BEGIN_CODING":
      return s.stage === "clarify" ? { ...s, stage: "code", phase: "base" } : s;
    case "SUBMIT": {
      if (s.stage !== "code") return s;
      const rec = s.records[s.phase];
      const best = rec.best && ratio(rec.best) >= ratio(e.result) ? rec.best : e.result;
      return { ...s, records: { ...s.records, [s.phase]: { ...rec, attempts: rec.attempts + 1, best } } };
    }
    case "LOCK": {
      if (s.stage !== "code") return s;
      const rec = s.records[s.phase];
      if (rec.attempts === 0) return s;
      const records = { ...s.records, [s.phase]: { ...rec, snapshot: e.files, lockedAtMs: e.nowMs } };
      const next = s.phases[s.phases.indexOf(s.phase) + 1];
      return next
        ? { ...s, records, stage: "storm", phase: next }
        : { ...s, records, stage: "debrief", endedAtMs: e.nowMs };
    }
    case "ACCEPT_STORM":
      return s.stage === "storm" ? { ...s, stage: "code" } : s;
  }
}

/** Requirement ids the player knows about at this point: the brief's visible ones plus everything their questions revealed. */
export function knownRequirements(reqs: Requirement[], questions: ClarifyQuestion[], asked: string[]): Set<string> {
  const known = new Set(reqs.filter((r) => !r.hidden).map((r) => r.id));
  for (const q of questions) if (asked.includes(q.id)) q.reveals.forEach((id) => known.add(id));
  return known;
}

/** Hidden requirements of a phase the player never uncovered: the "surprise" a storm springs on them. */
export function surprises(reqs: Requirement[], questions: ClarifyQuestion[], asked: string[], phase: PhaseId): Requirement[] {
  const known = knownRequirements(reqs, questions, asked);
  return reqs.filter((r) => r.phase === phase && r.hidden && !known.has(r.id));
}
