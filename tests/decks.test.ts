import { describe, expect, it } from "vitest";
import { DECKS, deckIdFromSearch, getDeck } from "@/content/decks";

describe("deck registry", () => {
  it("has unique deck ids and globally unique card ids", () => {
    expect(new Set(DECKS.map((d) => d.id)).size).toBe(DECKS.length);
    const ids = DECKS.flatMap((d) => d.cards.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("resolves ?deck= and falls back to the default", () => {
    expect(deckIdFromSearch("?deck=solid-square")).toBe("solid-square");
    expect(deckIdFromSearch("?deck=nope")).toBe("old-town");
    expect(deckIdFromSearch("")).toBe("old-town");
    expect(getDeck(null).id).toBe("old-town");
  });
  it("resolves the Creational Foundry deck", () => {
    expect(deckIdFromSearch("?deck=creational-foundry")).toBe("creational-foundry");
    expect(getDeck("creational-foundry").cards.length).toBeGreaterThanOrEqual(36);
  });
  it("resolves the Structural Bridges deck", () => {
    expect(deckIdFromSearch("?deck=structural-bridges")).toBe("structural-bridges");
    expect(getDeck("structural-bridges").cards.length).toBeGreaterThanOrEqual(36);
  });
  it("resolves the Behavioural Theatre deck", () => {
    expect(deckIdFromSearch("?deck=behavioural-theatre")).toBe("behavioural-theatre");
    expect(getDeck("behavioural-theatre").cards.length).toBeGreaterThanOrEqual(65);
  });
  it("every card has a valid answer index and at least one option", () => {
    for (const d of DECKS) for (const c of d.cards) {
      expect(c.options.length).toBeGreaterThan(1);
      for (const a of c.answer) expect(a).toBeLessThan(c.options.length);
    }
  });
});

describe("battle scenes", () => {
  it("every deck names a backdrop and SOLID Square has its own", () => {
    for (const d of DECKS) expect(["old-town", "solid-square", "foundry", "bridges", "theatre"]).toContain(d.scene);
    expect(getDeck("solid-square").scene).toBe("solid-square");
    expect(getDeck("old-town").scene).toBe("old-town");
    expect(getDeck("creational-foundry").scene).toBe("foundry");
    expect(getDeck("structural-bridges").scene).toBe("bridges");
    expect(getDeck("behavioural-theatre").scene).toBe("theatre");
  });
});
