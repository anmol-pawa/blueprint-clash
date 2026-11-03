import type { Responsibility, PhaseId } from "@/lib/workshop/types";
import { PHASE_ORDER } from "@/lib/workshop/types";
import type { Board } from "./model";
import { validateBoard } from "./model";

export type ResponsibilityVerdict = "ok" | "misplaced" | "duplicated" | "missing";

export interface ResponsibilityResult {
  id: string;
  text: string;
  verdict: ResponsibilityVerdict;
  /** Class names the player tagged with it. */
  tagged: string[];
  /** 0..1 credit for this responsibility. */
  credit: number;
  hint: string;
}

export interface BoardFlag {
  kind: "god-class" | "empty-class" | "unrelated-class" | "invalid";
  message: string;
}

export interface BoardScore {
  /** 0..1, feeds `workshopScore`'s `boardScore` (15 %). */
  score: number;
  results: ResponsibilityResult[];
  flags: BoardFlag[];
}

/** A class carrying more than this many rubric responsibilities is flagged as a god class. */
export const GOD_CLASS_RESPONSIBILITIES = 4;
const MISPLACED_CREDIT = 0.5;
const DUPLICATE_CREDIT = 0.5;
const FLAG_PENALTY = 0.05;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Scores a board against the responsibility rubric. Names are matched loosely (case and punctuation
 * ignored) so `LoanPolicy` and `loan_policy` agree. Only responsibilities up to `upToPhase` count, so the
 * base board is not marked down for requirements a Change Storm has not revealed yet.
 */
export function scoreBoard(board: Board, rubric: Responsibility[], upToPhase: PhaseId = "storm3"): BoardScore {
  const limit = PHASE_ORDER.indexOf(upToPhase);
  const active = rubric.filter((r) => PHASE_ORDER.indexOf(r.phase) <= limit);
  const results: ResponsibilityResult[] = active.map((r) => {
    const tagged = board.classes.filter((c) => c.responsibilities.includes(r.id)).map((c) => c.name);
    const allowed = new Set(r.owners.map(norm));
    if (tagged.length === 0) {
      return { id: r.id, text: r.text, verdict: "missing", tagged, credit: 0, hint: "Nobody owns this yet. Tag it on one class." };
    }
    if (tagged.length > 1) {
      const credit = tagged.some((n) => allowed.has(norm(n))) ? DUPLICATE_CREDIT : 0;
      return {
        id: r.id,
        text: r.text,
        verdict: "duplicated",
        tagged,
        credit,
        hint: `Owned by ${tagged.join(" and ")}. One responsibility, one owner: decide which class it belongs to.`,
      };
    }
    if (allowed.has(norm(tagged[0]))) {
      return { id: r.id, text: r.text, verdict: "ok", tagged, credit: 1, hint: "" };
    }
    return {
      id: r.id,
      text: r.text,
      verdict: "misplaced",
      tagged,
      credit: MISPLACED_CREDIT,
      hint: `${tagged[0]} is a surprising owner. Ask which class changes when this rule changes.`,
    };
  });

  const flags: BoardFlag[] = [];
  for (const issue of validateBoard(board)) {
    if (issue.severity === "error") flags.push({ kind: "invalid", message: issue.message });
  }
  const connected = new Set(board.edges.flatMap((e) => [e.from, e.to]));
  for (const c of board.classes) {
    const owned = active.filter((r) => c.responsibilities.includes(r.id)).length;
    if (owned > GOD_CLASS_RESPONSIBILITIES) {
      flags.push({ kind: "god-class", message: `${c.name} owns ${owned} responsibilities; split it so each class has one reason to change` });
    }
    if (owned === 0 && c.methods.length === 0 && c.fields.length === 0 && c.kind !== "enum") {
      flags.push({ kind: "empty-class", message: `${c.name} has no members and owns nothing` });
    }
    if (board.classes.length > 1 && !connected.has(c.id)) {
      flags.push({ kind: "unrelated-class", message: `${c.name} is not connected to anything` });
    }
  }

  const base = results.length === 0 ? 0 : results.reduce((s, r) => s + r.credit, 0) / results.length;
  const score = Math.max(0, base - FLAG_PENALTY * flags.length);
  return { score: Math.round(score * 1000) / 1000, results, flags };
}
