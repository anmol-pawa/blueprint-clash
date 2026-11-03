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
  it("every card has a valid answer index and at least one option", () => {
    for (const d of DECKS) for (const c of d.cards) {
      expect(c.options.length).toBeGreaterThan(1);
      for (const a of c.answer) expect(a).toBeLessThan(c.options.length);
    }
  });
});
