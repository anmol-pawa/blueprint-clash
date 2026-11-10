import { checkState, checkStuck, enabledThreads, initialState, stateKey, step } from "./engine";
import type { Event, Program, State, Violation, ViolationKind } from "./types";

export interface Finding {
  violation: Violation;
  /** Shortest schedule (in steps) that reaches the violation. */
  schedule: number[];
  trace: Event[];
}

export interface ExploreOptions {
  /** Stop after this many distinct states (default 200 000). */
  maxStates?: number;
  /** Keep searching after the first violation to report one trace per kind. */
  collectAll?: boolean;
}

export interface ExploreResult {
  findings: Finding[];
  statesExplored: number;
  /** True when the whole state space was searched. */
  complete: boolean;
  /** True only when the search was complete and found nothing: a bounded proof. */
  proved: boolean;
}

interface Node {
  state: State;
  parent: number;
  tid: number;
  event?: Event;
}

/** Breadth-first search over every interleaving, de-duplicated by state, so counterexamples are shortest. */
export function explore(p: Program, opts: ExploreOptions = {}): ExploreResult {
  const maxStates = opts.maxStates ?? 200_000;
  const nodes: Node[] = [{ state: initialState(p), parent: -1, tid: -1 }];
  const seen = new Set<string>([stateKey(nodes[0].state)]);
  const found = new Map<ViolationKind, Finding>();
  let complete = true;

  const pathTo = (idx: number, last?: { tid: number; event: Event }): Pick<Finding, "schedule" | "trace"> => {
    const schedule: number[] = [];
    const trace: Event[] = [];
    for (let i = idx; i > 0; i = nodes[i].parent) {
      schedule.push(nodes[i].tid);
      trace.push(nodes[i].event as Event);
    }
    schedule.reverse();
    trace.reverse();
    if (last) {
      schedule.push(last.tid);
      trace.push(last.event);
    }
    return { schedule, trace };
  };
  const record = (v: Violation, idx: number, last?: { tid: number; event: Event }): boolean => {
    if (!found.has(v.kind)) found.set(v.kind, { violation: v, ...pathTo(idx, last) });
    return !opts.collectAll;
  };

  for (let i = 0; i < nodes.length; i++) {
    const { state } = nodes[i];
    const bad = checkState(p, state);
    if (bad && record(bad, i)) break;
    const enabled = enabledThreads(p, state);
    if (enabled.length === 0) {
      const stuck = checkStuck(p, state);
      if (stuck && record(stuck, i)) break;
      continue;
    }
    let stop = false;
    for (const tid of enabled) {
      const r = step(p, state, tid);
      if (r.violation) {
        if (record(r.violation, i, { tid, event: r.event })) {
          stop = true;
          break;
        }
        continue;
      }
      const key = stateKey(r.state);
      if (seen.has(key)) continue;
      if (seen.size >= maxStates) {
        complete = false;
        continue;
      }
      seen.add(key);
      nodes.push({ state: r.state, parent: i, tid, event: r.event });
    }
    if (stop) break;
  }

  const findings = [...found.values()];
  const searchedAll = complete && findings.length === 0;
  return { findings, statesExplored: seen.size, complete: complete && (opts.collectAll || findings.length === 0), proved: searchedAll };
}

/** Renders the C++ snippet of one thread from the `cpp` annotations (used to keep snippet and IR in sync). */
export function renderCpp(p: Program, tid: number): string[] {
  return p.threads[tid].code.flatMap((i) => (i.cpp ? [i.cpp] : []));
}
