import { describe, expect, it } from "vitest";
import { CREATIONAL_FOUNDRY_LESSONS } from "@/content/lessons/creational-foundry";
import { SOLID_SQUARE_LESSONS } from "@/content/lessons/solid-square";
import { STRUCTURAL_BRIDGES_LESSONS } from "@/content/lessons/structural-bridges";
import { BEHAVIOURAL_THEATRE_LESSONS } from "@/content/lessons/behavioural-theatre";
import { BEHAVIOURAL_THEATRE_LESSONS_2 } from "@/content/lessons/behavioural-theatre-2";
import { BEHAVIOURAL_THEATRE_LESSONS_3 } from "@/content/lessons/behavioural-theatre-3";
import { BEHAVIOURAL_THEATRE_LESSONS_4 } from "@/content/lessons/behavioural-theatre-4";
import { MODELLING_LESSONS } from "@/content/lessons/modelling";
import { compileAndRun } from "@/lib/judge/native";
import { validateLessons } from "@/lib/lessons/model";
import { reviewFiles } from "@/lib/review";

const LESSONS = [...SOLID_SQUARE_LESSONS, ...CREATIONAL_FOUNDRY_LESSONS, ...STRUCTURAL_BRIDGES_LESSONS, ...BEHAVIOURAL_THEATRE_LESSONS, ...BEHAVIOURAL_THEATRE_LESSONS_2, ...BEHAVIOURAL_THEATRE_LESSONS_3, ...BEHAVIOURAL_THEATRE_LESSONS_4, ...MODELLING_LESSONS];

describe("SOLID Square, Creational Foundry, Structural Bridges and Behavioural Theatre lessons", () => {
  it("are well-formed", () => {
    expect(validateLessons(LESSONS)).toEqual([]);
  });
  for (const l of LESSONS) {
    it(`${l.id}: before and after compile, print the recorded output, and after is review-clean`, async () => {
      const b = await compileAndRun(l.before);
      expect(b.ok, b.stderr).toBe(true);
      expect(b.stdout.trimEnd()).toBe(l.beforeOutput);
      const a = await compileAndRun(l.after);
      expect(a.ok, a.stderr).toBe(true);
      expect(a.stdout.trimEnd()).toBe(l.afterOutput);
      const review = reviewFiles([{ path: "main.cpp", content: l.after }]);
      expect(review.findings.filter((f) => f.severity !== "minor")).toEqual([]);
      expect(review.clean).toBe(true);
    });
  }
});
