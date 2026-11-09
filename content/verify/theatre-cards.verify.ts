import { describe, expect, it } from "vitest";
import { BEHAVIOURAL_THEATRE_DECK } from "@/content/cards/behavioural-theatre";
import { validateCards } from "@/lib/battle/cards";
import { verifyPredictCards } from "@/lib/battle/verify";

describe("Behavioural Theatre deck", () => {
  it("is well-formed and every predict card matches native output", async () => {
    expect(validateCards(BEHAVIOURAL_THEATRE_DECK)).toEqual([]);
    expect(await verifyPredictCards(BEHAVIOURAL_THEATRE_DECK)).toEqual([]);
  });
  it("covers each pattern with at least 5 cards and a predict card", () => {
    expect(BEHAVIOURAL_THEATRE_DECK.length).toBeGreaterThanOrEqual(65);
    for (const t of ["strategy", "observer", "command", "state", "template-method", "iterator", "chain-of-responsibility", "mediator", "memento", "visitor", "interpreter", "null-object", "specification"]) {
      const cs = BEHAVIOURAL_THEATRE_DECK.filter((c) => c.topic === `L5.${t}`);
      expect(cs.length).toBeGreaterThanOrEqual(5);
      expect(cs.some((c) => c.kind === "predict")).toBe(true);
    }
  });
});
