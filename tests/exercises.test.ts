import { describe, expect, it } from "vitest";
import { listExercises, loadExercise } from "@/lib/exercises/load";
import { validateExercise } from "@/lib/exercises/validate";
import type { ExercisePackage } from "@/lib/exercises/types";

const IDS = ["bank-account", "file-handle", "inventory", "stack", "counter", "temperature"];

describe("exercise packages", () => {
  it("ships the six Old Town class exercises", async () => {
    expect(await listExercises()).toEqual([...IDS].sort());
  });

  it.each(IDS)("%s is structurally valid", async (id) => {
    const pkg = await loadExercise(id);
    expect(validateExercise(pkg)).toEqual([]);
    expect(pkg.meta.id).toBe(id);
  });
});

describe("validateExercise", () => {
  const load = () => loadExercise("bank-account");
  const clone = (p: ExercisePackage): ExercisePackage => structuredClone(p);

  it("flags a missing hint, a TODO left in the reference and too few wrong solutions", async () => {
    const p = clone(await load());
    p.meta.hints[1] = " ";
    p.reference[0].content += "\n// TODO";
    p.meta.wrong = p.meta.wrong.slice(0, 1);
    const errs = validateExercise(p);
    expect(errs).toContain("hint ladder needs three non-empty hints");
    expect(errs).toContain("reference contains a TODO");
    expect(errs).toContain("need at least 2 known-wrong solutions");
  });

  it("flags a wrong solution that cites a test that does not exist", async () => {
    const p = clone(await load());
    p.meta.wrong[0].failingTests = ["Nope.Missing"];
    expect(validateExercise(p).join("\n")).toMatch(/cites unknown test Nope\.Missing/);
  });

  it("flags tests that do not include the solution and a starter with no TODO", async () => {
    const p = clone(await load());
    p.tests[0].content = p.tests[0].content.replace('#include "solution.h"', "");
    p.starter[0].content = p.starter[0].content.replace("TODO", "todo");
    const errs = validateExercise(p);
    expect(errs).toContain('tests must #include "solution.h"');
    expect(errs).toContain("starter should say what to do with a TODO");
  });

  it("accepts a compile-rejected wrong solution without failing tests", async () => {
    const p = clone(await load());
    p.meta.wrong[0] = { ...p.meta.wrong[0], failingTests: [], rejects: "compile" };
    expect(validateExercise(p)).toEqual([]);
  });
});
