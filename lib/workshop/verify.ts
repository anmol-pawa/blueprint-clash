// Native verification of a Workshop package (ARCH §3). Node only.
import { DRIVER, judgeNative, type NativeResult } from "@/lib/judge/native";
import type { ProjectFile } from "@/lib/judge/types";
import { activePhases } from "./validate";
import type { PhaseId, WorkshopFile, WorkshopPackage } from "./types";

/** Test files for `phase` and every earlier phase (a storm re-runs all old tests: regressions count). */
export function testFilesUpTo(pkg: WorkshopPackage, phase: PhaseId): ProjectFile[] {
  const phases = activePhases(pkg);
  const upTo = phases.slice(0, phases.indexOf(phase) + 1);
  const out: ProjectFile[] = [{ path: "api.h", content: pkg.apiHeader }, DRIVER];
  for (const p of upTo) for (const f of pkg.tests[p] ?? []) out.push({ path: `tests_${p}_${f.path}`, content: f.content });
  return out;
}

/** Runs the hidden tests of `phase` (cumulative) against a design. Designs are compiled like the browser: no exceptions. */
export async function runPhase(pkg: WorkshopPackage, design: WorkshopFile[], phase: PhaseId): Promise<NativeResult> {
  const files = [...testFilesUpTo(pkg, phase), ...design.map((f) => ({ path: f.path, content: f.content }))];
  return judgeNative(files, { noExceptions: true });
}

export function failedTests(r: NativeResult): string[] {
  return r.summary.tests.filter((t) => t.status !== "pass").map((t) => `${t.suite}.${t.name}`);
}
