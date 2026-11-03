import { describe, expect, it } from "vitest";
import { DAY_MS, buildQueue, masteryState, newSrsCard, recordAnswer, reviewCard, rustLevel } from "@/lib/srs";
import type { SrsCard } from "@/lib/save/schema";

const T0 = 1_000_000_000_000;

describe("reviewCard", () => {
  it("grows intervals 1, 3, then by ease", () => {
    let c = reviewCard(undefined, true, T0);
    expect(c.intervalDays).toBe(1);
    c = reviewCard(c, true, T0 + DAY_MS);
    expect(c.intervalDays).toBe(3);
    c = reviewCard(c, true, T0 + 4 * DAY_MS);
    expect(c.intervalDays).toBeGreaterThanOrEqual(7);
    expect(c.reps).toBe(3);
  });
  it("a miss resets reps, counts a lapse, lowers ease (floored) and returns in 10 minutes", () => {
    let c: SrsCard = { due: T0, intervalDays: 30, ease: 1.35, reps: 5, lapses: 0 };
    c = reviewCard(c, false, T0);
    expect(c).toMatchObject({ reps: 0, lapses: 1, intervalDays: 0, ease: 1.3 });
    expect(c.due).toBe(T0 + 600_000);
  });
  it("assisted correct answers never advance mastery", () => {
    const c = reviewCard(undefined, true, T0);
    expect(reviewCard(c, true, T0 + DAY_MS, true)).toEqual(c);
  });
  it("ease is capped", () => {
    let c: SrsCard = newSrsCard(T0);
    for (let i = 0; i < 40; i++) c = reviewCard(c, true, T0);
    expect(c.ease).toBeLessThanOrEqual(2.8);
  });
});

describe("masteryState and rust", () => {
  it("walks unseen to ingrained", () => {
    expect(masteryState(undefined)).toBe("unseen");
    expect(masteryState({ ...newSrsCard(T0), reps: 0 })).toBe("seen");
    expect(masteryState({ due: 0, intervalDays: 3, ease: 2, reps: 2, lapses: 0 })).toBe("learning");
    expect(masteryState({ due: 0, intervalDays: 8, ease: 2, reps: 3, lapses: 0 })).toBe("practiced");
    expect(masteryState({ due: 0, intervalDays: 25, ease: 2, reps: 5, lapses: 0 })).toBe("mastered");
    expect(masteryState({ due: 0, intervalDays: 70, ease: 2, reps: 7, lapses: 0 })).toBe("ingrained");
  });
  it("rust grows with overdue time relative to the interval", () => {
    const c: SrsCard = { due: T0, intervalDays: 10, ease: 2, reps: 3, lapses: 0 };
    expect(rustLevel(c, T0 - 1)).toBe(0);
    expect(rustLevel(c, T0 + 1 * DAY_MS)).toBe(0);
    expect(rustLevel(c, T0 + 3 * DAY_MS)).toBe(1);
    expect(rustLevel(c, T0 + 10 * DAY_MS)).toBe(2);
    expect(rustLevel(undefined, T0)).toBe(0);
  });
});

describe("buildQueue", () => {
  it("orders due cards by overdue, then adds capped new cards", () => {
    const srs: Record<string, SrsCard> = {
      a: { due: T0 - 1 * DAY_MS, intervalDays: 1, ease: 2, reps: 1, lapses: 0 },
      b: { due: T0 - 5 * DAY_MS, intervalDays: 1, ease: 2, reps: 1, lapses: 0 },
      c: { due: T0 + DAY_MS, intervalDays: 1, ease: 2, reps: 1, lapses: 0 },
    };
    expect(buildQueue(srs, ["a", "b", "c", "n1", "n2", "n3"], T0, { max: 10, maxNew: 2 })).toEqual(["b", "a", "n1", "n2"]);
    expect(buildQueue(srs, ["a", "b", "c", "n1"], T0, { max: 2, maxNew: 2 })).toEqual(["b", "a"]);
  });
  it("recordAnswer writes into the map", () => {
    const srs: Record<string, SrsCard> = {};
    recordAnswer(srs, "x", false, T0);
    expect(srs.x.lapses).toBe(1);
  });
});
