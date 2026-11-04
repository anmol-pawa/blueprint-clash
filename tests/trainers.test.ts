import { describe, expect, it } from "vitest";
import { answer, currentCard, startBattle } from "@/lib/battle/battle";
import { validateCards } from "@/lib/battle/cards";
import { DUEL_CONFIG, ROOK_FERRIS, SABLE_QUILL, TRAINERS, duelFlag, getTrainer, trainerCards, trainerPool } from "@/content/trainers";
import { SCRIPTS } from "@/lib/dialogue/scripts";

describe("trainer duels", () => {
  it("each trainer has a big enough topic-filtered pool and a valid duel hand", () => {
    for (const t of TRAINERS) {
      expect(trainerPool(t).length).toBeGreaterThanOrEqual(t.cardCount);
      for (const seed of [0, 1, 17, 996]) {
        const hand = trainerCards(t, seed);
        expect(hand).toHaveLength(t.cardCount);
        expect(new Set(hand.map((c) => c.id)).size).toBe(t.cardCount);
        expect(validateCards(hand)).toEqual([]);
        expect(hand.every((c) => t.topics.includes(c.topic))).toBe(true);
      }
    }
  });

  it("the two trainers teach different principles", () => {
    const a = new Set(trainerPool(SABLE_QUILL).map((c) => c.id));
    expect(trainerPool(ROOK_FERRIS).some((c) => a.has(c.id))).toBe(false);
  });

  it("is deterministic per seed, and different seeds vary the hand", () => {
    expect(trainerCards(SABLE_QUILL, 5).map((c) => c.id)).toEqual(trainerCards(SABLE_QUILL, 5).map((c) => c.id));
    expect(trainerCards(SABLE_QUILL, 5).map((c) => c.id)).not.toEqual(trainerCards(SABLE_QUILL, 6).map((c) => c.id));
  });

  it("a flawless duel is won within the hand, and a no-answer duel is lost", () => {
    let s = startBattle(trainerCards(ROOK_FERRIS, 3), 1, { ...DUEL_CONFIG });
    while (s.status === "asking") s = answer(s, currentCard(s)!.answer).state;
    expect(s.status).toBe("won");
    expect(s.missed).toEqual([]);
    expect(s.answered).toBeLessThanOrEqual(ROOK_FERRIS.cardCount);
    let l = startBattle(trainerCards(ROOK_FERRIS, 3), 1, { ...DUEL_CONFIG });
    while (l.status === "asking") {
      const c = currentCard(l)!;
      l = answer(l, [c.options.findIndex((_, i) => !c.answer.includes(i))]).state;
    }
    expect(l.status).toBe("lost");
  });

  it("flags are stable, ids resolve, and the overworld dialogue points to the duel", () => {
    expect(duelFlag(SABLE_QUILL)).toBe("duel:sable-quill");
    expect(getTrainer("rook-ferris")).toBe(ROOK_FERRIS);
    expect(getTrainer("nobody")).toBeUndefined();
    expect(JSON.stringify(SCRIPTS["sable-intro"])).toContain("Sable Quill duel");
    expect(JSON.stringify(SCRIPTS["rook-intro"])).toContain("Rook Ferris duel");
  });
});
