import { describe, expect, it } from "vitest";
import { ALL_LESSONS, lessonById } from "@/content/lessons/registry";
import { validateLessons } from "@/lib/lessons/model";
import { SOLID_SQUARE_DECK } from "@/content/cards/solid-square";
import { CREATIONAL_FOUNDRY_DECK } from "@/content/cards/creational-foundry";

describe("lessons", () => {
  it("are structurally valid with unique ids", () => {
    expect(validateLessons(ALL_LESSONS)).toEqual([]);
    expect(lessonById("srp")?.title).toMatch(/Single Responsibility/);
    expect(lessonById("nope")).toBeUndefined();
  });
  it("cover SRP, OCP, LSP, ISP, DIP and the heuristics", () => {
    expect(ALL_LESSONS.filter((l) => l.level === "L2").map((l) => l.id)).toEqual(["srp", "ocp", "lsp", "isp", "dip", "heuristics"]);
  });
  it("cover the seven Creational Foundry patterns", () => {
    expect(ALL_LESSONS.filter((l) => l.level === "L3").map((l) => l.id)).toEqual([
      "factory-method", "abstract-factory", "builder", "prototype", "singleton", "object-pool", "di",
    ]);
  });
  it("each lesson's card topic has cards to drill", () => {
    const cards = [...SOLID_SQUARE_DECK, ...CREATIONAL_FOUNDRY_DECK];
    for (const l of ALL_LESSONS) {
      expect(cards.some((c) => c.topic.startsWith(l.cardTopic)), l.id).toBe(true);
    }
  });
  it("validateLessons catches problems", () => {
    const l = { ...ALL_LESSONS[0], after: ALL_LESSONS[0].before, overApplication: "short" };
    expect(validateLessons([l, l]).length).toBeGreaterThanOrEqual(3);
  });
});
