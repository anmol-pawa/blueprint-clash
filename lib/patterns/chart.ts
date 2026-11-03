/**
 * The type chart (GDD §5.2): design problems vs Patternlings.
 * A problem lists its best fits, plausible-but-heavier choices (neutral with a
 * YAGNI penalty) and the failure mode shown when a wrong pattern is picked.
 */
import { patternlingById } from "./roster";

export type Effectiveness = "super" | "neutral" | "weak";

export interface DesignProblem {
  id: string;
  /** The monster: a smell or requirement, in the player's words. */
  name: string;
  brief: string;
  best: readonly string[];
  /** Works, but heavier than needed. */
  heavy: readonly string[];
  /** Why a wrong pick fails, keyed by Patternling id; `default` covers the rest. */
  failure: Readonly<Record<string, string>> & { default: string };
}

export interface Matchup {
  effectiveness: Effectiveness;
  /** Damage multiplier applied to the player's attack. */
  multiplier: number;
  explanation: string;
}

export const MULTIPLIER: Record<Effectiveness, number> = { super: 2, neutral: 1, weak: 0.5 };
/** A heavy-but-working choice is neutral, then shaved by this YAGNI factor. */
export const YAGNI_FACTOR = 0.75;

export function matchup(problem: DesignProblem, patternlingId: string): Matchup {
  const p = patternlingById(patternlingId);
  if (!p) throw new Error(`unknown patternling ${patternlingId}`);
  if (problem.best.includes(patternlingId)) {
    return { effectiveness: "super", multiplier: MULTIPLIER.super, explanation: `${p.name} fits: ${p.solves}` };
  }
  if (problem.heavy.includes(patternlingId)) {
    return {
      effectiveness: "neutral",
      multiplier: MULTIPLIER.neutral * YAGNI_FACTOR,
      explanation: `${p.name} works here, but it is heavier than needed. ${p.cost}`,
    };
  }
  return { effectiveness: "weak", multiplier: MULTIPLIER.weak, explanation: problem.failure[patternlingId] ?? problem.failure.default };
}

/** Starter problems for the party UI and tests; district gyms add more. */
export const DESIGN_PROBLEMS: readonly DesignProblem[] = [
  {
    id: "switch-on-type",
    name: "The Switch Beast",
    brief: "A fee calculator has a switch on vehicle type. Every new vehicle edits it.",
    best: ["chamelstrat"],
    heavy: ["templar", "shapeshift"],
    failure: { default: "That pattern does not remove the type switch, so the next vehicle still edits the same function.", solo: "A single instance of the calculator does nothing about the branching inside it." },
  },
  {
    id: "mode-switch",
    name: "The Flag Swarm",
    brief: "A vending machine tracks its mode in an enum and every method checks it.",
    best: ["shapeshift"],
    heavy: ["chamelstrat"],
    failure: { default: "The flag checks survive: the behaviour still depends on a mode scattered across methods." },
  },
  {
    id: "wrong-interface",
    name: "The Misfit Plug",
    brief: "A third-party payment SDK has a different interface from the one your code expects.",
    best: ["axolink"],
    heavy: ["facadeon", "proxifox"],
    failure: { default: "Callers still cannot use the SDK through the interface they depend on." },
  },
  {
    id: "stacked-options",
    name: "The Combo Hydra",
    brief: "Coffee with any mix of milk, sugar and syrup: a subclass per combination is exploding.",
    best: ["shellcrab"],
    heavy: ["beaverbuild", "chamelstrat"],
    failure: { default: "Combinations still need a new class each; the explosion is not stopped." },
  },
  {
    id: "global-hoard",
    name: "The Lone Logger",
    brief: "Exactly one hardware printer handle may exist in the whole process.",
    best: ["solo"],
    heavy: ["forgebot"],
    failure: { default: "Nothing stops a second instance from being created." },
  },
];

export const problemById = (id: string): DesignProblem | undefined => DESIGN_PROBLEMS.find((p) => p.id === id);
