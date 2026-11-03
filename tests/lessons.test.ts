import { describe, expect, it } from "vitest";
import { ALL_LESSONS, lessonById } from "@/content/lessons/registry";
import { validateLessons } from "@/lib/lessons/model";
import { SOLID_SQUARE_DECK } from "@/content/cards/solid-square";

describe("lessons", () => {
  it("are structurally valid with unique ids", () => {
    expect(validateLessons(ALL_LESSONS)).toEqual([]);
    expect(lessonById("srp")?.title).toMatch(/Single Responsibility/);
    expect(lessonById("nope")).toBeUndefined();
  });
  it("cover SRP, OCP, LSP, ISP, DIP and the heuristics", () => {
    expect(ALL_LESSONS.map((l) => l.id)).toEqual(["srp", "ocp", "lsp", "isp", "dip", "heuristics"]);
  });
  it("each lesson's card topic has cards to drill", () => {
    for (const l of ALL_LESSONS) {
      expect(SOLID_SQUARE_DECK.some((c) => c.topic.startsWith(l.cardTopic)), l.id).toBe(true);
    }
  });
  it("validateLessons catches problems", () => {
    const l = { ...ALL_LESSONS[0], after: ALL_LESSONS[0].before, overApplication: "short" };
    expect(validateLessons([l, l]).length).toBeGreaterThanOrEqual(3);
  });
});
