import { checkState, checkStuck, enabledThreads, initialState, isDone, stateKey, step } from "./engine";
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

interface Edge {
  to: number;
  tid: number;
  event: Event;
}

/** Tarjan's strongly connected components, iterative so deep graphs cannot overflow the call stack. */
function sccs(edges: Edge[][]): number[][] {
  const n = edges.length;
  const index = new Array<number>(n).fill(-1);
  const low = new Array<number>(n).fill(0);
  const onStack = new Array<boolean>(n).fill(false);
  const stack: number[] = [];
  const out: number[][] = [];
  let counter = 0;
  for (let root = 0; root < n; root++) {
    if (index[root] !== -1) continue;
    const work: Array<[number, number]> = [[root, 0]];
    index[root] = low[root] = counter++;
    stack.push(root);
    onStack[root] = true;
    while (work.length) {
      const top = work[work.length - 1];
      const [v, ei] = top;
      if (ei < edges[v].length) {
        top[1]++;
        const w = edges[v][ei].to;
        if (index[w] === -1) {
          index[w] = low[w] = counter++;
          stack.push(w);
          onStack[w] = true;
          work.push([w, 0]);
        } else if (onStack[w]) low[v] = Math.min(low[v], index[w]);
      } else {
        work.pop();
        if (work.length) {
          const u = work[work.length - 1][0];
          low[u] = Math.min(low[u], low[v]);
        }
        if (low[v] === index[v]) {
          const comp: number[] = [];
          let w: number;
          do {
            w = stack.pop() as number;
            onStack[w] = false;
            comp.push(w);
          } while (w !== v);
          out.push(comp);
        }
      }
    }
  }
  return out;
}

/** Breadth-first search over every interleaving, de-duplicated by state, so counterexamples are shortest. */
export function explore(p: Program, opts: ExploreOptions = {}): ExploreResult {
  const maxStates = opts.maxStates ?? 200_000;
  const nodes: Node[] = [{ state: initialState(p), parent: -1, tid: -1 }];
  const seen = new Map<string, number>([[stateKey(nodes[0].state), 0]]);
  const edges: Edge[][] = [[]];
  const found = new Map<ViolationKind, Finding>();
  let complete = true;
  let stoppedEarly = false;

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
    if (bad && record(bad, i)) {
      stoppedEarly = true;
      break;
    }
    const enabled = enabledThreads(p, state);
    if (enabled.length === 0) {
      const stuck = checkStuck(p, state);
      if (stuck && record(stuck, i)) {
        stoppedEarly = true;
        break;
      }
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
      const known = seen.get(key);
      if (known !== undefined) {
        edges[i].push({ to: known, tid, event: r.event });
        continue;
      }
      if (seen.size >= maxStates) {
        complete = false;
        continue;
      }
      seen.set(key, nodes.length);
      edges[i].push({ to: nodes.length, tid, event: r.event });
      nodes.push({ state: r.state, parent: i, tid, event: r.event });
      edges.push([]);
    }
    if (stop) {
      stoppedEarly = true;
      break;
    }
  }

  if (complete && !stoppedEarly && !found.size) {
    const live = findLivelock(p, nodes, edges, pathTo);
    if (live) found.set("livelock", live);
  }

  const findings = [...found.values()];
  const searchedAll = complete && findings.length === 0;
  return { findings, statesExplored: seen.size, complete: complete && (opts.collectAll || findings.length === 0), proved: searchedAll };
}

/**
 * A livelock is a strongly connected set of states in which every unfinished thread takes steps
 * (so a fair scheduler could stay there forever) yet no thread can ever finish. Spinning on a flag
 * that another thread has yet to set is not reported: the setter never steps inside that component.
 */
function findLivelock(
  p: Program,
  nodes: Node[],
  edges: Edge[][],
  pathTo: (idx: number) => Pick<Finding, "schedule" | "trace">,
): Finding | null {
  let best: { comp: number[]; entry: number } | null = null;
  for (const comp of sccs(edges)) {
    const inComp = new Set(comp);
    const stepping = new Set<number>();
    for (const v of comp) for (const e of edges[v]) if (inComp.has(e.to)) stepping.add(e.tid);
    if (stepping.size === 0) continue;
    const entry = Math.min(...comp);
    const unfinished = p.threads.map((_, tid) => tid).filter((tid) => !isDone(p, nodes[entry].state, tid));
    if (unfinished.length === 0 || !unfinished.every((tid) => stepping.has(tid))) continue;
    if (!best || entry < best.entry) best = { comp, entry };
  }
  if (!best) return null;
  const inComp = new Set(best.comp);
  // Breadth-first search inside the component for the next edge taken by `tid` (or any edge back to `target`).
  const walk = (from: number, want: (e: Edge) => boolean): { edges: Edge[]; at: number } | null => {
    const prev = new Map<number, Edge & { from: number }>();
    const queue = [from];
    const visited = new Set<number>([from]);
    for (let q = 0; q < queue.length; q++) {
      const v = queue[q];
      for (const e of edges[v]) {
        if (!inComp.has(e.to)) continue;
        if (want(e)) {
          const path: Edge[] = [e];
          for (let c = v; c !== from; ) {
            const pe = prev.get(c) as Edge & { from: number };
            path.unshift(pe);
            c = pe.from;
          }
          return { edges: path, at: e.to };
        }
        if (!visited.has(e.to)) {
          visited.add(e.to);
          prev.set(e.to, { ...e, from: v });
          queue.push(e.to);
        }
      }
    }
    return null;
  };
  const lap: Edge[] = [];
  let cur = best.entry;
  const unfinished = p.threads.map((_, tid) => tid).filter((tid) => !isDone(p, nodes[best.entry].state, tid));
  for (const tid of unfinished) {
    const seg = walk(cur, (e) => e.tid === tid);
    if (!seg) return null;
    lap.push(...seg.edges);
    cur = seg.at;
  }
  if (cur !== best.entry) {
    const back = walk(cur, (e) => e.to === best.entry);
    if (!back) return null;
    lap.push(...back.edges);
  }
  const head = pathTo(best.entry);
  const names = unfinished.map((t) => p.threads[t].name).join(", ");
  return {
    violation: {
      kind: "livelock",
      message: `Livelock: ${names} all keep running (${best.comp.length} states in the cycle) but none can ever finish. The schedule ends after one full lap of the cycle.`,
    },
    schedule: [...head.schedule, ...lap.map((e) => e.tid)],
    trace: [...head.trace, ...lap.map((e) => e.event)],
  };
}

/** Renders the C++ snippet of one thread from the `cpp` annotations (used to keep snippet and IR in sync). */
export function renderCpp(p: Program, tid: number): string[] {
  return p.threads[tid].code.flatMap((i) => (i.cpp ? [i.cpp] : []));
}
