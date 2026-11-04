import { describe, expect, it } from "vitest";
import { OLD_TOWN_DECK } from "@/content/cards/old-town";
import { OLD_TOWN_MASTER, oldTownMasterDeck } from "@/content/masters/old-town";
import { OLD_TOWN_MASTER_SMELLS } from "@/content/masters/old-town-smells";
import { validateCards, type Card } from "@/lib/battle/cards";
import { DEFAULT_MASTER_CONFIG, earnsBadge, masterAnswer, masterCard, masterHpFraction, masterStars, startMaster, submitWorkshop, type MasterState } from "@/lib/battle/master";
import { EXERCISE_META } from "@/content/exercises/registry";
import { MASTERS, masterIdFromSearch } from "@/content/masters";
import { SOLID_SQUARE_DECK } from "@/content/cards/solid-square";
import { SOLID_SQUARE_MASTER, solidSquareMasterDeck } from "@/content/masters/solid-square";
import { SOLID_SQUARE_MASTER_SMELLS } from "@/content/masters/solid-square-smells";
import { loadExercise } from "@/lib/exercises/load";

const mcq = (n: number, prefix = "c"): Card[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, kind: "mcq", topic: "t", level: 2, prompt: "p", options: ["a", "b", "c"], answer: [0], explain: "e" }));
const smells = (n: number): Card[] =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i}`, kind: "smell", topic: "t", level: 2, prompt: "p", code: "int x;", options: ["a", "b"], answer: [0], explain: "e" }));

const right = (s: MasterState) => masterCard(s)!.answer;
const wrong = (s: MasterState) => [[0, 1, 2].find((i) => !masterCard(s)!.answer.includes(i))!];

/** Plays every card correctly until the phase changes. */
function clear(s: MasterState): MasterState {
  const phase = s.phase;
  while (s.phase === phase) s = masterAnswer(s, right(s)).state;
  return s;
}

const cfg = { ...DEFAULT_MASTER_CONFIG, cardsFoeHp: 24, smellFoeHp: 24 };
const fresh = () => startMaster({ cards: mcq(8), smells: smells(8) }, 1, cfg);

describe("master content", () => {
  it("the dedicated smell cards are well-formed and all smell cards", () => {
    expect(validateCards(OLD_TOWN_MASTER_SMELLS)).toEqual([]);
    expect(OLD_TOWN_MASTER_SMELLS.every((c) => c.kind === "smell")).toBe(true);
    const ids = new Set(OLD_TOWN_DECK.map((c) => c.id));
    expect(OLD_TOWN_MASTER_SMELLS.some((c) => ids.has(c.id))).toBe(false);
  });

  it("the Old Town master has enough cards for both card phases and a real exercise", async () => {
    const d = oldTownMasterDeck();
    expect(d.cards.length).toBeGreaterThanOrEqual(15);
    expect(d.smells.length).toBeGreaterThanOrEqual(6);
    expect(validateCards(d.cards)).toEqual([]);
    expect(await loadExercise(OLD_TOWN_MASTER.exercises[0])).toBeTruthy();
  });
});

describe("master fight", () => {
  it("runs cards -> workshop -> smell -> won and earns the badge", () => {
    let s = fresh();
    expect(s.phase).toBe("cards");
    s = clear(s);
    expect(s.phase).toBe("workshop");
    expect(masterCard(s)).toBeUndefined();
    const o = submitWorkshop(s, { passed: 7, total: 7 });
    expect(o.beaten).toBe(true);
    s = o.state;
    expect(s.phase).toBe("smell");
    expect(masterCard(s)!.kind).toBe("smell");
    s = clear(s);
    expect(s.phase).toBe("won");
    expect(earnsBadge(s)).toBe(true);
    expect(masterStars(s)).toBe(3);
    expect(masterHpFraction(s)).toBe(0);
  });

  it("rejects non-smell cards in the smell deck", () => {
    expect(() => startMaster({ cards: mcq(2), smells: mcq(2, "x") }, 1)).toThrow(/smell/);
    expect(() => startMaster({ cards: [], smells: smells(1) }, 1)).toThrow();
  });

  it("a wrong card costs HP; HP carries into later phases and heals a little between phases", () => {
    let s = fresh();
    s = masterAnswer(s, wrong(s)).state;
    expect(s.playerHp).toBe(cfg.playerHp - cfg.counterDamage);
    s = clear(s);
    expect(s.playerHp).toBe(cfg.playerHp - cfg.counterDamage + cfg.healBetweenPhases);
    s = submitWorkshop(s, { passed: 3, total: 3 }).state;
    expect(s.battle!.playerHp).toBe(s.playerHp);
  });

  it("healing never exceeds max HP", () => {
    const s = clear(fresh());
    expect(s.playerHp).toBe(cfg.playerHp);
  });

  it("a partial workshop pass fails, costs HP, and three failures lose the fight", () => {
    let s = clear(fresh());
    for (let i = 1; i <= 3; i++) {
      const o = submitWorkshop(s, { passed: 5, total: 7 });
      expect(o.beaten).toBe(false);
      expect(o.damageToPlayer).toBe(cfg.workshopMissDamage);
      s = o.state;
      expect(s.phase).toBe(i < 3 ? "workshop" : "lost");
    }
    expect(s.endedIn).toBe("workshop");
    expect(masterStars(s)).toBe(0);
    expect(earnsBadge(s)).toBe(false);
    expect(s.workshopBest).toBeCloseTo(5 / 7);
  });

  it("an assisted pass (reference viewed) does not beat the master", () => {
    const s = clear(fresh());
    expect(submitWorkshop(s, { passed: 7, total: 7, assisted: true }).beaten).toBe(false);
    expect(submitWorkshop(s, { passed: 0, total: 0 }).beaten).toBe(false);
  });

  it("running out of HP in a card phase loses and keeps the board for display", () => {
    let s = startMaster({ cards: mcq(20), smells: smells(4) }, 3, { ...cfg, playerHp: 20 });
    while (s.phase === "cards") s = masterAnswer(s, wrong(s)).state;
    expect(s.phase).toBe("lost");
    expect(s.endedIn).toBe("cards");
    expect(s.battle).not.toBeNull();
    expect(masterHpFraction(s)).toBe(1);
  });

  it("a workshop miss at 1 HP loses immediately", () => {
    const s = { ...clear(fresh()), playerHp: 5 };
    expect(submitWorkshop(s, { passed: 0, total: 7 }).state.phase).toBe("lost");
  });

  it("guards illegal calls and never mutates its input", () => {
    const s = fresh();
    const snapshot = JSON.stringify(s);
    masterAnswer(s, right(s));
    expect(JSON.stringify(s)).toBe(snapshot);
    expect(() => submitWorkshop(s, { passed: 1, total: 1 })).toThrow();
    expect(() => masterAnswer(clear(s), [0])).toThrow();
  });

  it("master HP falls monotonically through a clean run", () => {
    let s = fresh();
    const seen = [masterHpFraction(s)];
    while (s.phase === "cards") { s = masterAnswer(s, right(s)).state; seen.push(masterHpFraction(s)); }
    expect(masterHpFraction(s)).toBeCloseTo(0.6);
    s = submitWorkshop(s, { passed: 1, total: 1 }).state;
    while (s.phase === "smell") { s = masterAnswer(s, right(s)).state; seen.push(masterHpFraction(s)); }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeLessThanOrEqual(seen[i - 1]);
    expect(seen.at(-1)).toBe(0);
  });

  it("stars drop with slips, counting missed cards and failed submissions", () => {
    let s = fresh();
    s = masterAnswer(s, wrong(s)).state;
    s = clear(s);
    s = submitWorkshop(submitWorkshop(s, { passed: 0, total: 3 }).state, { passed: 3, total: 3 }).state;
    s = clear(s);
    expect(s.phase).toBe("won");
    expect(s.missed.length + s.workshopFails).toBe(2);
    expect(masterStars(s)).toBe(2);
  });

  it("the real Old Town master is beatable end to end", () => {
    const d = oldTownMasterDeck();
    let s = startMaster(d, 7);
    s = clear(s);
    s = submitWorkshop(s, { passed: 8, total: 8 }).state;
    s = clear(s);
    expect(s.phase).toBe("won");
  });
});

describe("Provost Marlow (SOLID Square master)", () => {
  it("has well-formed, all-smell dedicated cards that do not repeat the deck", () => {
    expect(validateCards(SOLID_SQUARE_MASTER_SMELLS)).toEqual([]);
    expect(SOLID_SQUARE_MASTER_SMELLS.every((c) => c.kind === "smell")).toBe(true);
    const ids = new Set(SOLID_SQUARE_DECK.map((c) => c.id));
    expect(SOLID_SQUARE_MASTER_SMELLS.some((c) => ids.has(c.id))).toBe(false);
    expect(new Set(SOLID_SQUARE_MASTER_SMELLS.map((c) => c.topic)).size).toBeGreaterThanOrEqual(5);
  });

  it("has enough cards for both card phases and all eight refactors exist and are registered", async () => {
    const d = solidSquareMasterDeck();
    expect(d.cards.length).toBeGreaterThanOrEqual(15);
    expect(validateCards(d.cards)).toEqual([]);
    expect(d.cards.some((c) => c.kind === "smell")).toBe(false);
    expect(SOLID_SQUARE_MASTER.exercises).toHaveLength(8);
    for (const e of SOLID_SQUARE_MASTER.exercises) {
      expect(EXERCISE_META[e], e).toBeTruthy();
      expect(await loadExercise(e), e).toBeTruthy();
    }
  });

  it("is selected by ?master= and falls back to Old Town", () => {
    expect(masterIdFromSearch("?master=solid-square")).toBe("solid-square");
    expect(masterIdFromSearch("?master=nope")).toBe("old-town");
    expect(masterIdFromSearch("")).toBe("old-town");
    expect(MASTERS["solid-square"].profile.badge).toBe("solid-square");
  });

  it("a full clean run earns the badge", () => {
    const d = solidSquareMasterDeck();
    let s = startMaster(d, 3);
    s = clear(s);
    expect(s.phase).toBe("workshop");
    s = submitWorkshop(s, { passed: 5, total: 5 }).state;
    s = clear(s);
    expect(s.phase).toBe("won");
    expect(earnsBadge(s)).toBe(true);
    expect(masterStars(s)).toBe(3);
  });
});
