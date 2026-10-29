import type { ExercisePackage } from "./types";

/** Structural checks that need no compiler. Returns human-readable problems (empty when valid). */
export function validateExercise(pkg: ExercisePackage): string[] {
  const errs: string[] = [];
  const { meta } = pkg;
  if (!pkg.prompt.trim()) errs.push("prompt.md is empty");
  if (pkg.api !== undefined && !pkg.api.includes("#pragma once")) errs.push("api.h must contain #pragma once");
  if (!meta.concepts.length) errs.push("no concepts listed");
  if (meta.hints.some((h) => !h.trim())) errs.push("hint ladder needs three non-empty hints");
  for (const [label, files] of [["starter", pkg.starter], ["reference", pkg.reference]] as const) {
    if (!files.some((f) => f.path === "solution.h")) errs.push(`${label}/ must contain solution.h`);
  }
  if (pkg.reference.some((f) => /\bTODO\b/.test(f.content))) errs.push("reference contains a TODO");
  if (!pkg.starter.some((f) => /\bTODO\b/.test(f.content))) errs.push("starter should say what to do with a TODO");
  if (pkg.tests.length === 0) errs.push("tests/ has no files");
  if (!pkg.tests.some((f) => /#include\s+"solution\.h"/.test(f.content))) errs.push('tests must #include "solution.h"');
  const testCount = pkg.tests.reduce((n, f) => n + (f.content.match(/^TEST\(/gm)?.length ?? 0), 0);
  if (testCount < 5) errs.push(`only ${testCount} tests; need at least 5`);

  if (meta.wrong.length < 2) errs.push("need at least 2 known-wrong solutions");
  const dirs = meta.wrong.map((w) => w.dir);
  for (const d of dirs.filter((x, i) => dirs.indexOf(x) !== i)) errs.push(`duplicate wrong dir ${d}`);
  for (const w of meta.wrong) {
    if (!pkg.wrong[w.dir]?.some((f) => f.path === "solution.h")) errs.push(`wrong/${w.dir} has no solution.h`);
    if (!w.reason.trim()) errs.push(`wrong/${w.dir} has no reason`);
    if ((w.rejects ?? "tests") === "tests" && w.failingTests.length === 0) errs.push(`wrong/${w.dir} documents no failing test`);
    for (const t of w.failingTests) {
      const [suite, name] = t.split(".");
      if (!new RegExp(`TEST\\(\\s*${suite}\\s*,\\s*${name}\\s*\\)`).test(pkg.tests.map((f) => f.content).join("\n"))) {
        errs.push(`wrong/${w.dir} cites unknown test ${t}`);
      }
    }
  }
  return errs;
}
