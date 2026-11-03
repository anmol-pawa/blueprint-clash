import { describe, expect, it } from "vitest";
import { newSave } from "@/lib/save/schema";
import { awardBadge } from "@/lib/save/progress";
import { loadSave, memorySaveStore, updateSave } from "@/lib/save/store";
import { toExerciseBundle, exerciseHidden, exerciseProvided } from "@/lib/exercises/bundle";
import { loadExercise } from "@/lib/exercises/load";
import { DRIVER } from "@/lib/judge/native";

describe("awardBadge", () => {
  it("adds a badge once and persists it", async () => {
    const store = memorySaveStore();
    const s0 = newSave(1);
    const s1 = await updateSave(store, s0, (d) => { awardBadge(d, "old-town"); awardBadge(d, "old-town"); }, 2);
    expect(s1.badges).toEqual(["old-town"]);
    expect(s0.badges).toEqual([]);
    expect((await loadSave(store, 3)).data.badges).toEqual(["old-town"]);
  });
});

describe("exercise bundle", () => {
  it("carries the starter and hidden tests without the reference", async () => {
    const b = toExerciseBundle(await loadExercise("file-handle"), DRIVER);
    expect(b.testCount).toBeGreaterThan(3);
    expect(exerciseProvided(b).map((f) => f.path)).toEqual(["api.h"]);
    const hidden = exerciseHidden(b);
    expect(hidden[0].path).toBe(DRIVER.path);
    expect(hidden.some((f) => f.path.startsWith("tests_"))).toBe(true);
    expect(JSON.stringify(b)).not.toContain("void release()");
    expect(b.starter.length).toBeGreaterThan(0);
  });
});
