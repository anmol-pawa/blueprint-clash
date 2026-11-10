import type { Board, BoardClass, BoardEdge, BoardMethod, EdgeKind } from "@/lib/board";
import type { Responsibility } from "@/lib/workshop/types";

/** A standalone Design Board drill (GDD 5.3 step 2): a short brief, a rubric and a reference board. */
export interface BoardDrill {
  id: string;
  title: string;
  /** The interview-style brief, deliberately short. */
  brief: string;
  rubric: Responsibility[];
  reference: Board;
  /** Honest trade-offs: what the reference chose, the alternative, and when the alternative wins. */
  tradeoffs: string[];
  /** What a Senior / Staff candidate adds beyond the reference. */
  levelSignal: string;
  /** The class that coordinates the use case; the "god class" variant piles everything on it. */
  facade: string;
}

export const cls = (id: string, name: string, over: Partial<BoardClass> = {}): BoardClass => ({
  id, name, kind: "class", fields: [], methods: [], responsibilities: [], ...over,
});
export const m = (name: string, returns: string, params = "", over: Partial<BoardMethod> = {}): BoardMethod => ({
  name, returns, params, isConst: false, isAbstract: false, ...over,
});
export const pure = (name: string, returns: string, params = "", isConst = true): BoardMethod =>
  m(name, returns, params, { isAbstract: true, isConst });
export const edge = (id: string, from: string, to: string, kind: EdgeKind, toMult?: string): BoardEdge => ({ id, from, to, kind, toMult });

/** Flawed variant 1: every responsibility piled on the facade (the classic god class). */
export function godVariant(d: BoardDrill): Board {
  const all = d.rubric.map((r) => r.id);
  return {
    ...d.reference,
    classes: d.reference.classes.map((c) => ({ ...c, responsibilities: c.name === d.facade ? all : [] })),
  };
}

/** Flawed variant 2: one responsibility moved to a class that should not own it. */
export function misplaceVariant(d: BoardDrill, resId: string, toName: string): Board {
  return {
    ...d.reference,
    classes: d.reference.classes.map((c) => {
      const without = c.responsibilities.filter((r) => r !== resId);
      return { ...c, responsibilities: c.name === toName ? [...without, resId] : without };
    }),
  };
}
