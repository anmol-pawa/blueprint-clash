// A Workshop problem in the shape the browser needs: serialisable, no hidden-reference extras (bad designs).
// Pure: the server page builds it at build time, the client only calls the helpers below.
import type { ProjectFile } from "@/lib/judge/types";
import { activePhases } from "./validate";
import { PHASE_ORDER, type ClarifyQuestion, type FollowUp, type Level, type PhaseId, type Requirement, type Responsibility, type WorkshopFile, type WorkshopPackage } from "./types";

export interface WorkshopBundle {
  id: string;
  title: string;
  level: Level;
  parMinutes: number;
  patterns: string[];
  requirements: Requirement[];
  brief: string;
  editorial: string;
  clarify: ClarifyQuestion[];
  rubric: Responsibility[];
  followups: FollowUp[];
  apiHeader: string;
  phaseApis: Partial<Record<PhaseId, string>>;
  phases: PhaseId[];
  tests: Partial<Record<PhaseId, WorkshopFile[]>>;
  reference: WorkshopFile[];
  driver: ProjectFile;
}

export function toBundle(pkg: WorkshopPackage, driver: ProjectFile): WorkshopBundle {
  const { meta } = pkg;
  return {
    id: meta.id,
    title: meta.title,
    level: meta.level,
    parMinutes: meta.parMinutes,
    patterns: meta.patterns,
    requirements: meta.requirements,
    brief: pkg.brief,
    editorial: pkg.editorial,
    clarify: pkg.clarify,
    rubric: pkg.rubric,
    followups: pkg.followups,
    apiHeader: pkg.apiHeader,
    phaseApis: pkg.phaseApis,
    phases: activePhases(pkg),
    tests: pkg.tests,
    reference: pkg.reference,
    driver,
  };
}

/** What the player may see in the file tree for `phase`: `api.h` plus the headers of every storm that has arrived. */
export function providedFiles(b: WorkshopBundle, phase: PhaseId): ProjectFile[] {
  const upTo = b.phases.slice(0, b.phases.indexOf(phase) + 1);
  const out: ProjectFile[] = [{ path: "api.h", content: b.apiHeader, readOnly: true }];
  for (const p of upTo) {
    const api = b.phaseApis[p];
    if (api !== undefined) out.push({ path: `api_${p}.h`, content: api, readOnly: true });
  }
  return out;
}

/**
 * Hidden files added when judging `phase`: the driver, headers of storms still to come (the tests include them all),
 * and every test file up to and including this phase (a storm re-runs the old tests: regressions count).
 */
export function hiddenFiles(b: WorkshopBundle, phase: PhaseId): ProjectFile[] {
  const idx = b.phases.indexOf(phase);
  const out: ProjectFile[] = [b.driver];
  for (const p of PHASE_ORDER) {
    const api = b.phaseApis[p];
    if (api !== undefined && !b.phases.slice(0, idx + 1).includes(p)) out.push({ path: `api_${p}.h`, content: api, readOnly: true });
  }
  for (const p of b.phases.slice(0, idx + 1)) for (const f of b.tests[p] ?? []) out.push({ path: `tests_${p}_${f.path}`, content: f.content, readOnly: true });
  return out;
}

/** Number of TEST(...) cases up to `phase`; a compile error counts every one of them as failed. */
export function expectedTestCount(b: WorkshopBundle, phase: PhaseId): number {
  let n = 0;
  for (const p of b.phases.slice(0, b.phases.indexOf(phase) + 1)) for (const f of b.tests[p] ?? []) n += (f.content.match(/^\s*TEST\s*\(/gm) ?? []).length;
  return n;
}

export const STARTER: ProjectFile[] = [
  {
    path: "solution.cpp",
    content: '#include "api.h"\n\n// Implement the API declared in api.h. Use the + button to split your design across headers and sources.\n',
  },
];

/** Requirements the player can see in the brief or has uncovered, for the phases up to `phase`. */
export function visibleRequirements(b: WorkshopBundle, phase: PhaseId, known: Set<string>): Requirement[] {
  const upTo = b.phases.slice(0, b.phases.indexOf(phase) + 1);
  return b.requirements.filter((r) => upTo.includes(r.phase) && known.has(r.id));
}
