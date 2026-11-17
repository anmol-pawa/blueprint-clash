import { PHASE_ORDER, type PhaseId, type Responsibility } from "@/lib/workshop/types";
import { findClass, type Board } from "./model";

export type ResponsibilityStatus = "ok" | "duplicate" | "misplaced" | "missing";

export interface ResponsibilityResult {
  id: string;
  text: string;
  status: ResponsibilityStatus;
  /** Names of the classes the player tagged. */
  taggedNames: string[];
  /** 1 for ok, 0.5 for a duplicate that still includes a valid owner, 0 otherwise. */
  credit: number;
  feedback: string;
}

export interface BoardScore {
  /** 0..1: credit earned over responsibilities due so far. */
  score: number;
  results: ResponsibilityResult[];
  /** Classes carrying too many responsibilities (a design-level god class). */
  overloaded: { name: string; count: number }[];
  /** Concrete observations about relationships that interviewers look for. */
  notes: string[];
}

export const OVERLOAD_LIMIT = 4;

const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

/** Rubric entries due at `phase`: the base phase plus every storm up to and including it. */
export function dueResponsibilities(rubric: Responsibility[], phase: PhaseId): Responsibility[] {
  const limit = PHASE_ORDER.indexOf(phase);
  return rubric.filter((r) => PHASE_ORDER.indexOf(r.phase) <= limit);
}

/**
 * Scores a board against the responsibility rubric. Names are not compared to a model answer: a responsibility is
 * satisfied by tagging exactly one class whose name is in the rubric's owner list. Duplicates and misplacements are flagged.
 */
export function scoreBoard(board: Board, rubric: Responsibility[], phase: PhaseId = "base"): BoardScore {
  const due = dueResponsibilities(rubric, phase);
  const results: ResponsibilityResult[] = due.map((res) => {
    const taggedNames = (board.tags[res.id] ?? [])
      .map((id) => findClass(board, id)?.name)
      .filter((n): n is string => Boolean(n));
    const valid = taggedNames.filter((n) => res.owners.some((o) => same(o, n)));
    let status: ResponsibilityStatus;
    let credit: number;
    let feedback: string;
    if (taggedNames.length === 0) {
      status = "missing";
      credit = 0;
      feedback = "No class owns this yet. If nobody owns it, it will end up smeared across the code.";
    } else if (taggedNames.length > 1) {
      status = "duplicate";
      credit = valid.length > 0 ? 0.5 : 0;
      feedback = `Owned by ${taggedNames.join(", ")}. Pick one owner; shared ownership means two places change together.`;
    } else if (valid.length === 1) {
      status = "ok";
      credit = 1;
      feedback = `${taggedNames[0]} is a sensible owner.`;
    } else {
      status = "misplaced";
      credit = 0;
      feedback = `${taggedNames[0]} is an awkward owner. Ask which class has the data this responsibility needs.`;
    }
    return { id: res.id, text: res.text, status, taggedNames, credit, feedback };
  });

  const counts = new Map<string, number>();
  for (const ids of Object.values(board.tags)) {
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const overloaded = [...counts.entries()]
    .filter(([, n]) => n > OVERLOAD_LIMIT)
    .map(([id, count]) => ({ name: findClass(board, id)?.name ?? id, count }));

  const notes: string[] = [];
  const hasAbstraction = board.classes.some((c) => c.kind === "interface" || c.kind === "abstract");
  if (due.some((r) => r.phase !== "base") && !hasAbstraction) {
    notes.push("Later requirements will need an extension point: no interface or abstract class on the board yet.");
  }
  if (board.classes.length > 1 && board.relations.length === 0) notes.push("The classes are not connected: draw who owns or uses whom.");
  const total = due.length || 1;
  const score = results.reduce((sum, r) => sum + r.credit, 0) / total;
  return { score, results, overloaded, notes };
}
