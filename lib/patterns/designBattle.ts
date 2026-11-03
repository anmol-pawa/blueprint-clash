/**
 * Design battle (GDD §5.2): face a run of design-problem monsters and pick a Patternling for each.
 * Super picks kill outright and recruit the creature; heavier picks chip the monster (YAGNI);
 * wrong picks cost a heart and the monster explains the failure mode.
 */
import { DESIGN_PROBLEMS, matchup, type DesignProblem, type Matchup } from "./chart";
import { effectiveMultiplier, recordPick, recruit, type PartyState } from "./party";
import { patternlingById } from "./roster";

export const MONSTER_HP = 30;
export const BASE_DAMAGE = 15;
export const START_HEARTS = 3;

export type BattlePhase = "fighting" | "won" | "lost";

export interface DesignBattleState {
  problems: readonly DesignProblem[];
  index: number;
  foeHp: number;
  hearts: number;
  party: PartyState;
  phase: BattlePhase;
}

export interface PickResult {
  state: DesignBattleState;
  matchup: Matchup;
  damage: number;
  /** The monster fell on this pick. */
  defeated: boolean;
}

export function startDesignBattle(party: PartyState, problems: readonly DesignProblem[] = DESIGN_PROBLEMS): DesignBattleState {
  if (problems.length === 0) throw new Error("a design battle needs at least one problem");
  return { problems, index: 0, foeHp: MONSTER_HP, hearts: START_HEARTS, party, phase: "fighting" };
}

export const currentProblem = (s: DesignBattleState): DesignProblem | null => (s.phase === "fighting" ? s.problems[s.index] : null);

export function pickPatternling(s: DesignBattleState, patternlingId: string): PickResult {
  const problem = currentProblem(s);
  if (!problem) throw new Error("battle is over");
  if (!patternlingById(patternlingId)) throw new Error(`unknown patternling ${patternlingId}`);
  const m = matchup(problem, patternlingId);
  let party = recordPick(s.party, patternlingId, m);
  if (m.effectiveness === "super") party = recruit(party, patternlingId);
  const damage = m.effectiveness === "super" ? s.foeHp : Math.min(s.foeHp, Math.ceil(BASE_DAMAGE * effectiveMultiplier(s.party, m) - 1e-9));
  const foeHp = s.foeHp - damage;
  const hearts = m.effectiveness === "weak" ? s.hearts - 1 : s.hearts;
  const defeated = foeHp <= 0;
  let next: DesignBattleState = { ...s, party, foeHp, hearts };
  if (hearts <= 0) next = { ...next, phase: "lost" };
  else if (defeated) {
    next = next.index + 1 >= s.problems.length ? { ...next, phase: "won" } : { ...next, index: next.index + 1, foeHp: MONSTER_HP };
  }
  return { state: next, matchup: m, damage, defeated };
}
