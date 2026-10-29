// Native verification of a judged class exercise (ARCH §3). Node only.
import { DRIVER, judgeNative, type NativeResult } from "@/lib/judge/native";
import type { ProjectFile } from "@/lib/judge/types";
import type { WorkshopFile } from "@/lib/workshop/types";
import type { ExercisePackage } from "./types";

/** Judges `solution` (the player's files) against the hidden tests. Compiled like the browser: no exceptions. */
export function judgeExercise(pkg: ExercisePackage, solution: WorkshopFile[]): Promise<NativeResult> {
  const files: ProjectFile[] = [DRIVER];
  if (pkg.api !== undefined) files.push({ path: "api.h", content: pkg.api, readOnly: true });
  for (const f of pkg.tests) files.push({ path: `tests_${f.path}`, content: f.content, readOnly: true });
  for (const f of solution) files.push({ path: f.path, content: f.content });
  return judgeNative(files, { noExceptions: true });
}

export function failedTests(r: NativeResult): string[] {
  return r.summary.tests.filter((t) => t.status !== "pass").map((t) => `${t.suite}.${t.name}`);
}
