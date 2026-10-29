import { describe, expect, it } from "vitest";
import { listExercises, loadExercise } from "@/lib/exercises/load";
import { validateExercise } from "@/lib/exercises/validate";
import { failedTests, judgeExercise } from "@/lib/exercises/verify";
import type { ExercisePackage } from "@/lib/exercises/types";

const ids = await listExercises();

describe.each(ids)("exercise/%s", (id) => {
  let pkg: ExercisePackage;
  it("loads and is structurally valid", async () => {
    pkg = await loadExercise(id);
    expect(validateExercise(pkg)).toEqual([]);
  });

  it("the reference is accepted", async () => {
    const r = await judgeExercise(pkg, pkg.reference);
    expect(r.verdict, `${JSON.stringify(r.diagnostics.slice(0, 3))} ${failedTests(r).join(",")}`).toBe("accepted");
    expect(r.summary.tests.length).toBeGreaterThanOrEqual(5);
  });

  it("the starter compiles-or-fails but is never accepted", async () => {
    const r = await judgeExercise(pkg, pkg.starter);
    expect(r.verdict).not.toBe("accepted");
  });

  it("every known-wrong solution is rejected the documented way", async () => {
    for (const w of pkg.meta.wrong) {
      const r = await judgeExercise(pkg, pkg.wrong[w.dir]);
      if (w.rejects === "compile") {
        expect(r.verdict, `wrong/${w.dir} must be a compile error`).toBe("compile_error");
        continue;
      }
      expect(r.verdict, `wrong/${w.dir} must compile`).not.toBe("compile_error");
      expect(r.verdict, `wrong/${w.dir} must be rejected`).not.toBe("accepted");
      const failed = failedTests(r);
      for (const t of w.failingTests) expect(failed, `wrong/${w.dir}`).toContain(t);
    }
  });
});
