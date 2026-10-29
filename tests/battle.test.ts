import { describe, expect, it } from "vitest";
import { OLD_TOWN_DECK } from "@/content/cards/old-town";
import { answer, currentCard, DEFAULT_CONFIG, rng, shuffleOptions, startBattle, stars } from "@/lib/battle/battle";
import { isCorrect, validateCards, type Card } from "@/lib/battle/cards";
import { verifyPredictCards } from "@/lib/battle/verify";

const mini = (n: number): Card[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i}`, kind: "mcq", topic: "t", level: 1, prompt: "p", options: ["a", "b", "c"], answer: [0], explain: "e" }));

/** Selection that is right for the (shuffled) current card. */
const right = (s: ReturnType<typeof startBattle>) => currentCard(s)!.answer;
const wrong = (s: ReturnType<typeof startBattle>) => [[0, 1, 2].find((i) => !currentCard(s)!.answer.includes(i))!];

describe("cards", () => {
  it("the Old Town deck is well-formed", () => expect(validateCards(OLD_TOWN_DECK)).toEqual([]));

  it("every predict card's output is what g++ really prints", async () => {
    expect(await verifyPredictCards(OLD_TOWN_DECK)).toEqual([]);
  });

  it("multi-select needs the exact set", () => {
    const c = OLD_TOWN_DECK.find((x) => x.answer.length > 1)!;
    expect(isCorrect(c, c.answer)).toBe(true);
    expect(isCorrect(c, [c.answer[0]])).toBe(false);
    const extra = c.options.findIndex((_, i) => !c.answer.includes(i));
    expect(isCorrect(c, [...c.answer, extra])).toBe(false);
    expect(isCorrect(c, [c.answer[0], c.answer[0]])).toBe(false);
  });

  it("catches malformed cards", () => {
    const bad: Card = { id: "x", kind: "predict", topic: "t", level: 1, prompt: "p", options: ["1", "2"], answer: [0], explain: "e", code: "int main(){}", output: "2" };
    expect(validateCards([bad, bad]).join("\n")).toMatch(/duplicate id[\s\S]*recorded output/);
  });

  it("shuffling options keeps the right answer pointing at the same text", () => {
    for (const c of OLD_TOWN_DECK) {
      const s = shuffleOptions(c, rng(42));
      expect(s.answer.map((i) => s.options[i]).sort()).toEqual(c.answer.map((i) => c.options[i]).sort());
    }
  });
});

describe("battle", () => {
  it("is deterministic for a seed and differs across seeds", () => {
    const ids = (seed: number) => startBattle(OLD_TOWN_DECK, seed).queue.map((c) => c.id).join();
    expect(ids(1)).toBe(ids(1));
    expect(ids(1)).not.toBe(ids(2));
  });

  it("correct answers hurt the foe with a capped streak bonus", () => {
    let s = startBattle(mini(10), 1, { ...DEFAULT_CONFIG, foeHp: 1000 });
    const dmg: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = answer(s, right(s));
      dmg.push(r.result.damageToFoe);
      s = r.state;
    }
    expect(dmg).toEqual([12, 15, 18, 21, 21, 21]);
    expect(s.streak).toBe(6);
  });

  it("a wrong answer hurts the player, resets the streak and re-queues the card at the back", () => {
    let s = startBattle(mini(4), 3);
    const first = currentCard(s)!.id;
    ({ state: s } = answer(s, right(s)));
    const r = answer(s, wrong(s));
    expect(r.result.correct).toBe(false);
    expect(r.result.damageToPlayer).toBe(DEFAULT_CONFIG.counterDamage);
    expect(r.state.streak).toBe(0);
    expect(r.state.queue).toHaveLength(s.queue.length);
    expect(r.state.queue[r.state.queue.length - 1].id).toBe(currentCard(s)!.id);
    expect(r.state.missed).toEqual([currentCard(s)!.id]);
    expect(first).not.toBe(currentCard(s)!.id);
    expect(s.playerHp).toBe(DEFAULT_CONFIG.playerHp);
  });

  it("does not mutate the previous state", () => {
    const s = startBattle(mini(3), 5);
    const snap = JSON.stringify(s);
    answer(s, wrong(s));
    expect(JSON.stringify(s)).toBe(snap);
  });

  it("wins by depleting the foe and scores 3 stars for a flawless run", () => {
    let s = startBattle(OLD_TOWN_DECK, 7);
    while (s.status === "asking") s = answer(s, right(s)).state;
    expect(s.status).toBe("won");
    expect(s.foeHp).toBe(0);
    expect(stars(s)).toBe(3);
  });

  it("loses when the player runs out of HP and then rejects further answers", () => {
    let s = startBattle(mini(6), 9, { ...DEFAULT_CONFIG, playerHp: 20 });
    s = answer(s, wrong(s)).state;
    s = answer(s, wrong(s)).state;
    expect(s.status).toBe("lost");
    expect(s.playerHp).toBe(0);
    expect(stars(s)).toBe(0);
    expect(() => answer(s, [0])).toThrow();
  });

  it("an answered-everything victory with one miss earns 2 stars", () => {
    let s = startBattle(mini(2), 11, { ...DEFAULT_CONFIG, foeHp: 9999 });
    s = answer(s, wrong(s)).state;
    while (s.status === "asking") s = answer(s, right(s)).state;
    expect(s.status).toBe("won");
    expect(stars(s)).toBe(2);
  });
});
