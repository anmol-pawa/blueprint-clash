import { describe, expect, it } from "vitest";
import { answerCard, drawDeck, grade, rng, shuffleCard, startBattle, DEFAULT_CONFIG } from "@/lib/battle/battle";
import { buildPredictCards, validateDeck } from "@/lib/battle/deck";
import type { Card, McqCard, MultiCard } from "@/lib/battle/types";

const mcq: McqCard = { id: "q", kind: "mcq", topic: "t", prompt: "p", options: ["a", "b", "c"], answer: 1, explain: "because" };
const multi: MultiCard = { id: "m", kind: "multi", topic: "t", prompt: "p", options: ["a", "b", "c", "d"], answers: [0, 2], explain: "because" };

describe("grade", () => {
  it("checks single answers and exact multi-select sets", () => {
    expect(grade(mcq, 1)).toBe(true);
    expect(grade(mcq, 0)).toBe(false);
    expect(grade(multi, [2, 0])).toBe(true);
    expect(grade(multi, [0])).toBe(false);
    expect(grade(multi, [0, 1, 2])).toBe(false);
    expect(grade(multi, 0)).toBe(false);
  });
});

describe("answerCard", () => {
  it("applies streak damage then ends the battle in a win", () => {
    let s = startBattle();
    const dmg: number[] = [];
    for (let i = 0; i < 3 && s.outcome === "ongoing"; i++) {
      const r = answerCard(s, mcq, 1);
      dmg.push(r.damage);
      s = r.state;
    }
    expect(dmg).toEqual([20, 25, 30]); // nominal damage; the foe hp clamps at 0 (60 hp)
    expect(s.foeHp).toBe(0);
    expect(s.outcome).toBe("won");
    expect(s.streak).toBe(3);
  });

  it("a wrong answer resets the streak and hurts the player until they lose", () => {
    let s = startBattle();
    s = answerCard(s, mcq, 1).state;
    const r = answerCard(s, mcq, 0);
    expect(r.correct).toBe(false);
    expect(r.damage).toBe(DEFAULT_CONFIG.counterDamage);
    expect(r.state.streak).toBe(0);
    s = r.state;
    while (s.outcome === "ongoing") s = answerCard(s, mcq, 0).state;
    expect(s.outcome).toBe("lost");
    expect(s.playerHp).toBe(0);
  });

  it("is a no-op after the battle ends and never mutates its input", () => {
    const s0 = startBattle({ ...DEFAULT_CONFIG, foeHp: 10 });
    const won = answerCard(s0, mcq, 1).state;
    expect(s0.foeHp).toBe(10);
    expect(answerCard(won, mcq, 0).state).toBe(won);
  });

  it("caps the streak bonus", () => {
    let s = startBattle({ ...DEFAULT_CONFIG, foeHp: 1000 });
    let last = 0;
    for (let i = 0; i < 8; i++) {
      const r = answerCard(s, mcq, 1);
      last = r.damage;
      s = r.state;
    }
    expect(last).toBe(20 + 5 * 3);
  });
});

describe("shuffling", () => {
  it("keeps the correct option correct for every kind and seed", () => {
    for (let seed = 1; seed < 60; seed++) {
      const next = rng(seed);
      const m = shuffleCard(mcq, next) as McqCard;
      expect(m.options[m.answer]).toBe("b");
      const x = shuffleCard(multi, next) as MultiCard;
      expect(x.answers.map((i) => x.options[i]).sort()).toEqual(["a", "c"]);
    }
  });

  it("drawDeck is deterministic per seed and has no duplicate cards", () => {
    const cards: Card[] = [mcq, multi, { ...mcq, id: "q2" }, { ...mcq, id: "q3" }];
    const a = drawDeck(cards, 3, 42);
    expect(a).toEqual(drawDeck(cards, 3, 42));
    expect(new Set(a.map((c) => c.id)).size).toBe(3);
  });
});

describe("deck validation", () => {
  it("accepts good cards and flags bad ones", () => {
    expect(validateDeck([mcq, multi])).toEqual([]);
    const bad = validateDeck([{ ...mcq, answer: 9 }, { ...mcq, options: ["a", "a", "b"] }, { ...mcq }]);
    expect(bad.some((e) => e.includes("out of range"))).toBe(true);
    expect(bad.some((e) => e.includes("duplicate options"))).toBe(true);
    expect(bad.some((e) => e.includes("duplicate id"))).toBe(true);
  });

  it("predict cards need a generated output and put it at the answer index", () => {
    const src = [{ id: "p", topic: "t", code: "", distractors: ["x", "y"], explain: "e" }];
    expect(() => buildPredictCards(src, {})).toThrow();
    const [c] = buildPredictCards(src, { p: "ok\n" });
    expect(c.options[c.answer]).toBe("ok");
  });
});
