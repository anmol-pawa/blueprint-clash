import { describe, expect, it } from "vitest";
import { SOLID_SQUARE_DECK } from "@/content/cards/solid-square";
import { validateCards } from "@/lib/battle/cards";
import { verifyPredictCards } from "@/lib/battle/verify";

describe("SOLID Square deck", () => {
  it("is well-formed and every predict card matches native output", async () => {
    expect(validateCards(SOLID_SQUARE_DECK)).toEqual([]);
    expect(await verifyPredictCards(SOLID_SQUARE_DECK)).toEqual([]);
  });
  it("covers every principle with at least 3 cards and has at least 40 cards", () => {
    expect(SOLID_SQUARE_DECK.length).toBeGreaterThanOrEqual(40);
    for (const t of ["srp", "ocp", "lsp", "isp", "dip"]) {
      expect(SOLID_SQUARE_DECK.filter((c) => c.topic === `L2.${t}`).length).toBeGreaterThanOrEqual(3);
    }
  });
});
