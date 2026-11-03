// A judged class exercise in the shape the browser needs (serialisable, no reference or wrong solutions).
// Pure: a server page builds it at build time; the client calls the helpers.
import type { ProjectFile } from "@/lib/judge/types";
import type { ExercisePackage } from "./types";

export interface ExerciseBundle {
  id: string;
  title: string;
  prompt: string;
  api?: string;
  starter: ProjectFile[];
  tests: ProjectFile[];
  hints: [string, string, string];
  driver: ProjectFile;
  testCount: number;
}

const countTests = (files: readonly { content: string }[]): number => files.reduce((n, f) => n + (f.content.match(/^\s*TEST\s*\(/gm) ?? []).length, 0);

export function toExerciseBundle(pkg: ExercisePackage, driver: ProjectFile): ExerciseBundle {
  return {
    id: pkg.meta.id,
    title: pkg.meta.title,
    prompt: pkg.prompt,
    api: pkg.api,
    starter: pkg.starter.map((f) => ({ path: f.path, content: f.content })),
    tests: pkg.tests.map((f) => ({ path: f.path, content: f.content })),
    hints: pkg.meta.hints,
    driver,
    testCount: countTests(pkg.tests),
  };
}

/** Read-only files shown in the tree. */
export const exerciseProvided = (b: ExerciseBundle): ProjectFile[] => (b.api === undefined ? [] : [{ path: "api.h", content: b.api, readOnly: true }]);

/** Hidden files added when judging (same layout as `judgeExercise`). */
export const exerciseHidden = (b: ExerciseBundle): ProjectFile[] => [b.driver, ...b.tests.map((f) => ({ path: `tests_${f.path}`, content: f.content, readOnly: true }))];
