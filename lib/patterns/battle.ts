/**
 * Design battle (GDD §5.2): one design problem, a foe with HP, and a few "trust" hearts.
 * A super pick hits hard and befriends the Patternling; a weak pick costs a heart.
 */
import { effectiveMultiplier, hasGlobalStateDebuff, recordPick, recruit, type PartyState } from "./party";
import { matchup, problemById, type Effectiveness, type Matchup } from "./chart";

export const FOE_HP = 100;
export const BASE_DAMAGE = 40;
export const START_HEARTS = 3;

export interface BattleState {
  problemId: string;
  foeHp: number;
  hearts: number;
  picks: string[];
  status: "active" | "won" | "lost";
}

export interface PickOutcome {
  battle: BattleState;
  party: PartyState;
  effectiveness: Effectiveness;
  damage: number;
  explanation: string;
  /** True when this pick recruited a Patternling not yet owned. */
  recruited: boolean;
  debuffed: boolean;
}

export function startBattle(problemId: string): BattleState {
  if (!problemById(problemId)) throw new Error(`unknown design problem ${problemId}`);
  return { problemId, foeHp: FOE_HP, hearts: START_HEARTS, picks: [], status: "active" };
}

export function pick(battle: BattleState, party: PartyState, patternlingId: string): PickOutcome {
  const problem = problemById(battle.problemId);
  if (!problem) throw new Error(`unknown design problem ${battle.problemId}`);
  if (battle.status !== "active") throw new Error("battle is over");
  if (battle.picks.includes(patternlingId)) throw new Error(`${patternlingId} was already tried`);
  const m: Matchup = matchup(problem, patternlingId);
  const debuffed = hasGlobalStateDebuff(party) && m.effectiveness !== "super";
  const damage = Math.round(BASE_DAMAGE * effectiveMultiplier(party, m));
  const foeHp = Math.max(0, battle.foeHp - damage);
  const hearts = m.effectiveness === "weak" ? battle.hearts - 1 : battle.hearts;
  const recruited = m.effectiveness === "super" && !party.owned.includes(patternlingId);
  let next = recordPick(party, patternlingId, m);
  if (recruited) next = recruit(next, patternlingId);
  const status = foeHp === 0 ? "won" : hearts <= 0 ? "lost" : "active";
  return {
    battle: { ...battle, foeHp, hearts, picks: [...battle.picks, patternlingId], status },
    party: next,
    effectiveness: m.effectiveness,
    damage,
    explanation: m.explanation,
    recruited,
    debuffed,
  };
}
