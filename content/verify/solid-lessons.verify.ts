import { describe, expect, it } from "vitest";
import { SOLID_SQUARE_LESSONS } from "@/content/lessons/solid-square";
import { compileAndRun } from "@/lib/judge/native";
import { validateLessons } from "@/lib/lessons/model";
import { reviewFiles } from "@/lib/review";

describe("SOLID Square lessons", () => {
  it("are well-formed", () => {
    expect(validateLessons(SOLID_SQUARE_LESSONS)).toEqual([]);
  });
  for (const l of SOLID_SQUARE_LESSONS) {
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
