import type { WorkshopFile } from "@/lib/workshop/types";

/** A known-wrong solution and exactly how the judge must reject it. */
export interface WrongSolution {
  /** Folder under `wrong/`. */
  dir: string;
  /** Tests (`Suite.Name`) that must be among the failures. Ignored when `rejects` is "compile". */
  failingTests: string[];
  /** "tests" (default): compiles but fails behaviour tests. "compile": the language itself rejects it. */
  rejects?: "tests" | "compile";
  /** What is wrong with it, in the editorial's words. */
  reason: string;
}

export interface ExerciseMeta {
  id: string;
  title: string;
  /** Curriculum ideas the exercise drills (CUR L1/L2). */
  concepts: string[];
  /** A 3-rung ladder: nudge, direction, near-solution. */
  hints: [string, string, string];
  wrong: WrongSolution[];
}

/** A small judged class exercise as loaded from disk (`content/exercises/<id>/`). */
export interface ExercisePackage {
  meta: ExerciseMeta;
  prompt: string;
  /** Optional read-only header the tests and the solution both include. */
  api?: string;
  /** What the player starts with: compiles, fails the tests. */
  starter: WorkshopFile[];
  reference: WorkshopFile[];
  /** Hidden tests: one or more .cpp files that `#include "solution.h"`. */
  tests: WorkshopFile[];
  wrong: Record<string, WorkshopFile[]>;
}
