// Topology and traffic types for the fluid tick model (ARCH §4). Pure data plus validation.

export interface ComponentSpec {
  id: string;
  /** c: parallel servers (workers, cores, instances x concurrency). */
  servers: number;
  /** μ: requests per second one server completes. */
  serviceRate: number;
  /** Most requests allowed to wait. Arrivals beyond it are rejected at once. */
  queueLimit: number;
  /** Seconds a request waits before the caller gives up. */
  timeout: number;
}

export interface EdgeSpec {
  from: string;
  to: string;
  /** Probability that a request served at `from` calls `to` (1 = always, 0.2 = a 20 % cache miss). */
  weight: number;
  /** One-way network latency in seconds. */
  latency: number;
  /** Extra attempts after a failed call (0 = no retry). */
  retries: number;
}

export interface Topology {
  /** Component that receives the client traffic. */
  entry: string;
  components: ComponentSpec[];
  edges: EdgeSpec[];
}

export interface RateStep {
  /** Simulated second from which this rate applies. */
  from: number;
  /** Requests per second. */
  rate: number;
}

/** Piecewise-constant λ(t). Steps may be given in any order; the rate before the first step is 0. */
export function piecewiseRate(steps: readonly RateStep[]): (t: number) => number {
  const sorted = [...steps].sort((a, b) => a.from - b.from);
  return (t) => {
    let rate = 0;
    for (const s of sorted) {
      if (s.from <= t) rate = s.rate;
      else break;
    }
    return rate;
  };
}

/** Validates the topology and returns component ids in topological order (callers before callees). */
export function topologicalOrder(topology: Topology): string[] {
  const ids = new Set<string>();
  for (const c of topology.components) {
    if (ids.has(c.id)) throw new Error(`duplicate component ${c.id}`);
    ids.add(c.id);
    if (!Number.isInteger(c.servers) || c.servers < 1) throw new RangeError(`${c.id}: servers must be a positive integer`);
    if (!(c.serviceRate > 0)) throw new RangeError(`${c.id}: serviceRate must be positive`);
    if (!(c.queueLimit >= 0)) throw new RangeError(`${c.id}: queueLimit must be non-negative`);
    if (!(c.timeout > 0)) throw new RangeError(`${c.id}: timeout must be positive`);
  }
  if (!ids.has(topology.entry)) throw new Error(`unknown entry ${topology.entry}`);
  const indegree = new Map<string, number>([...ids].map((id) => [id, 0]));
  for (const e of topology.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) throw new Error(`edge ${e.from}->${e.to} names an unknown component`);
    if (!(e.weight >= 0 && e.weight <= 1)) throw new RangeError(`edge ${e.from}->${e.to}: weight must be in [0, 1]`);
    if (!(e.latency >= 0)) throw new RangeError(`edge ${e.from}->${e.to}: latency must be non-negative`);
    if (!Number.isInteger(e.retries) || e.retries < 0) throw new RangeError(`edge ${e.from}->${e.to}: retries must be a non-negative integer`);
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  }
  const order: string[] = [];
  const ready = [...ids].filter((id) => indegree.get(id) === 0);
  while (ready.length > 0) {
    const id = ready.shift() as string;
    order.push(id);
    for (const e of topology.edges) {
      if (e.from !== id) continue;
      const left = (indegree.get(e.to) ?? 0) - 1;
      indegree.set(e.to, left);
      if (left === 0) ready.push(e.to);
    }
  }
  if (order.length !== ids.size) throw new Error("topology has a cycle");
  return order;
}
