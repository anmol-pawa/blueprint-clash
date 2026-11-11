import { describe, expect, it } from "vitest";
import { MODELLING_DECK } from "@/content/cards/modelling";
import { ALL_LESSONS, lessonById } from "@/content/lessons/registry";
import { validateLessons } from "@/lib/lessons/model";
import { SOLID_SQUARE_DECK } from "@/content/cards/solid-square";
import { CREATIONAL_FOUNDRY_DECK } from "@/content/cards/creational-foundry";
import { STRUCTURAL_BRIDGES_DECK } from "@/content/cards/structural-bridges";
import { BEHAVIOURAL_THEATRE_DECK } from "@/content/cards/behavioural-theatre";
import { CONCURRENCY_DOCKS_DECK } from "@/content/cards/concurrency-docks";

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
  it("cover the seven Structural Bridges patterns", () => {
    expect(ALL_LESSONS.filter((l) => l.level === "L4").map((l) => l.id)).toEqual([
      "adapter", "bridge", "composite", "decorator", "facade", "flyweight", "proxy",
    ]);
  });
  it("cover fourteen Behavioural Theatre patterns in order", () => {
    expect(ALL_LESSONS.filter((l) => l.level === "L5").map((l) => l.id)).toEqual([
      "strategy", "observer", "command", "state", "template-method", "iterator", "chain-of-responsibility", "mediator",
      "memento", "visitor", "interpreter", "null-object", "specification", "event-driven",
    ]);
  });
  it("cover the Modelling and UML lessons so far", () => {
    expect(ALL_LESSONS.filter((l) => l.level === "L6").map((l) => l.id)).toEqual(["entities-from-requirements", "class-diagram-ownership", "state-diagram-vending", "sequence-diagram-checkout", "extension-points-from-requirements"]);
  });
  it("cover the six Concurrency Docks lessons", () => {
    expect(ALL_LESSONS.filter((l) => l.level === "L7").map((l) => l.id)).toEqual(["threads-share-less", "mutex-raii", "condvar-predicate", "atomics-check-then-act", "deadlock-lock-order", "thread-pool"]);
  });
  it("each lesson's card topic has cards to drill", () => {
    const cards = [...SOLID_SQUARE_DECK, ...CREATIONAL_FOUNDRY_DECK, ...STRUCTURAL_BRIDGES_DECK, ...BEHAVIOURAL_THEATRE_DECK, ...MODELLING_DECK, ...CONCURRENCY_DOCKS_DECK];
    for (const l of ALL_LESSONS) {
      expect(cards.some((c) => c.topic.startsWith(l.cardTopic)), l.id).toBe(true);
    }
  });
  it("validateLessons catches problems", () => {
    const l = { ...ALL_LESSONS[0], after: ALL_LESSONS[0].before, overApplication: "short" };
    expect(validateLessons([l, l]).length).toBeGreaterThanOrEqual(3);
  });
});
