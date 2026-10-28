export type Level = "SDE2" | "Senior" | "Staff";
export type PhaseId = "base" | "storm1" | "storm2" | "storm3";
export const PHASE_ORDER: PhaseId[] = ["base", "storm1", "storm2", "storm3"];

export interface Requirement {
  id: string;
  text: string;
  phase: PhaseId;
  /** Hidden requirements are not in the brief: a good clarifying question must reveal them. */
  hidden: boolean;
}

export interface ClarifyQuestion {
  id: string;
  text: string;
  answer: string;
  /** Requirement ids this answer makes known. Empty for questions that add no information. */
  reveals: string[];
  quality: "essential" | "useful" | "noise";
}

export interface Responsibility {
  id: string;
  text: string;
  phase: PhaseId;
  /** Class names that may legitimately own the responsibility. The reference must declare at least one. */
  owners: string[];
}

export interface BadDesign {
  /** Folder under `bad/`. */
  dir: string;
  /** The phase whose tests this design must fail (all earlier phases must pass). */
  failsPhase: PhaseId;
  /** Tests (`Suite.Name`) that must be among the failures. */
  failingTests: string[];
  /** What is wrong with the design, in the editorial's words. */
  reason: string;
}

export interface FollowUp {
  question: string;
  answer: string;
  level: Level;
}

export interface WorkshopMeta {
  id: string;
  title: string;
  level: Level;
  parMinutes: number;
  patterns: string[];
  requirements: Requirement[];
  bad: BadDesign[];
}

export interface WorkshopFile {
  path: string;
  content: string;
}

/** A problem as loaded from disk. */
export interface WorkshopPackage {
  meta: WorkshopMeta;
  brief: string;
  editorial: string;
  clarify: ClarifyQuestion[];
  rubric: Responsibility[];
  followups: FollowUp[];
  apiHeader: string;
  reference: WorkshopFile[];
  /** Test files per phase, keyed by phase id. */
  tests: Partial<Record<PhaseId, WorkshopFile[]>>;
  bad: Record<string, WorkshopFile[]>;
}
