import { describe, expect, it } from "vitest";
import { STRUCTURAL_BRIDGES_DECK } from "@/content/cards/structural-bridges";
import { validateCards } from "@/lib/battle/cards";
import { verifyPredictCards } from "@/lib/battle/verify";

describe("Structural Bridges deck", () => {
  it("is well-formed and every predict card matches native output", async () => {
    expect(validateCards(STRUCTURAL_BRIDGES_DECK)).toEqual([]);
    expect(await verifyPredictCards(STRUCTURAL_BRIDGES_DECK)).toEqual([]);
  });
  it("covers every pattern with at least 3 cards and has at least 30 cards", () => {
    expect(STRUCTURAL_BRIDGES_DECK.length).toBeGreaterThanOrEqual(30);
    for (const t of ["adapter", "bridge", "composite", "decorator", "facade", "flyweight", "proxy"]) {
      expect(STRUCTURAL_BRIDGES_DECK.filter((c) => c.topic === `L4.${t}`).length).toBeGreaterThanOrEqual(3);
    }
    expect(STRUCTURAL_BRIDGES_DECK.filter((c) => c.kind === "predict").length).toBeGreaterThanOrEqual(7);
  });
});
