import { describe, expect, it } from "vitest";
import { OLD_TOWN_DECK } from "@/content/cards/old-town";
import { validateCards } from "@/lib/battle/cards";
import { verifyPredictCards } from "@/lib/battle/verify";

describe("card decks", () => {
  it("Old Town deck is well-formed and every predict card matches native output", async () => {
    expect(validateCards(OLD_TOWN_DECK)).toEqual([]);
    expect(await verifyPredictCards(OLD_TOWN_DECK)).toEqual([]);
  });
});
