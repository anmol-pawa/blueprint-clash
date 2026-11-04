import { describe, expect, it } from "vitest";
import { CREATIONAL_FOUNDRY_DECK } from "@/content/cards/creational-foundry";
import { validateCards } from "@/lib/battle/cards";
import { verifyPredictCards } from "@/lib/battle/verify";

describe("Creational Foundry deck", () => {
  it("is well-formed and every predict card matches native output", async () => {
    expect(validateCards(CREATIONAL_FOUNDRY_DECK)).toEqual([]);
    expect(await verifyPredictCards(CREATIONAL_FOUNDRY_DECK)).toEqual([]);
  });
  it("covers every pattern with at least 3 cards and has at least 36 cards", () => {
    expect(CREATIONAL_FOUNDRY_DECK.length).toBeGreaterThanOrEqual(36);
    for (const t of ["factory-method", "abstract-factory", "builder", "prototype", "singleton"]) {
      expect(CREATIONAL_FOUNDRY_DECK.filter((c) => c.topic === `L3.${t}`).length).toBeGreaterThanOrEqual(3);
    }
    expect(CREATIONAL_FOUNDRY_DECK.filter((c) => c.kind === "predict").length).toBeGreaterThanOrEqual(7);
  });
});
