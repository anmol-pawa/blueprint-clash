// Fluid tick model (ARCH §4). One tick = one simulated second. Each component is an M/M/c queue
// whose backlog is carried between ticks; retries feed amplified load back into the graph with
// a one-tick lag, so retry storms emerge instead of being scripted. Deterministic (no randomness).
import { mmc, waitQuantile } from "./queueing";
import { topologicalOrder, type ComponentSpec, type EdgeSpec, type Topology } from "./topology";

/** Above this utilisation the analytic M/M/c latency is replaced by backlog drain time. */
export const SATURATION_RHO = 0.95;

export interface NodeTick {
  /** Requests that arrived this tick (including retries). */
  arrivals: number;
  served: number;
  /** Rejected (queue full) or abandoned (waited past the timeout) this tick. */
  dropped: number;
  /** Requests still waiting at the end of the tick. */
  backlog: number;
  /** Offered utilisation: arrivals / capacity. */
  rho: number;
  /** Mean time in this component (queue plus service), seconds. */
  meanLatency: number;
  /** 95th-percentile time in this component, seconds. */
  p95Latency: number;
  /** Probability that a request reaching this component fails, here or further down. */
  failure: number;
}

export interface TickResult {
  t: number;
  /** Client requests per second offered at the entry. */
  offered: number;
  goodput: number;
  errors: number;
  /** Mean end-to-end latency of requests that reach the entry, seconds (retry delay not included). */
  meanLatency: number;
  nodes: Record<string, NodeTick>;
}

/** Attempts per call when each attempt fails with probability f and up to r retries follow. */
export function attemptsPerCall(f: number, retries: number): number {
  let sum = 0;
  let p = 1;
  for (let k = 0; k <= retries; k++) {
    sum += p;
    p *= f;
  }
  return sum;
}

export class Simulation {
  private readonly order: string[];
  private readonly spec = new Map<string, ComponentSpec>();
  private readonly outgoing = new Map<string, EdgeSpec[]>();
  private readonly backlog = new Map<string, number>();
  private readonly lastFailure = new Map<string, number>();
  private time = 0;

  constructor(
    private readonly topology: Topology,
    private readonly rate: (t: number) => number,
  ) {
    this.order = topologicalOrder(topology);
    for (const c of topology.components) {
      this.spec.set(c.id, c);
      this.outgoing.set(c.id, []);
      this.backlog.set(c.id, 0);
      this.lastFailure.set(c.id, 0);
    }
    for (const e of topology.edges) this.outgoing.get(e.from)?.push(e);
  }

  step(): TickResult {
    const offered = Math.max(0, this.rate(this.time));
    const arrivals = new Map<string, number>(this.order.map((id) => [id, 0]));
    arrivals.set(this.topology.entry, offered);
    const nodes: Record<string, NodeTick> = {};
    const response = new Map<string, number>();

    // Forward pass: load flows from callers to callees.
    for (const id of this.order) {
      const c = this.spec.get(id) as ComponentSpec;
      const arrive = arrivals.get(id) ?? 0;
      const capacity = c.servers * c.serviceRate;
      const demand = (this.backlog.get(id) ?? 0) + arrive;
      const served = Math.min(demand, capacity);
      const rest = demand - served;
      const keep = Math.min(rest, c.queueLimit, c.timeout * capacity);
      const dropped = rest - keep;
      this.backlog.set(id, keep);
      const rho = arrive / capacity;
      let meanLatency: number;
      let p95: number;
      if (rho < SATURATION_RHO && keep === 0) {
        meanLatency = mmc(c.servers, arrive, c.serviceRate).meanResponse;
        p95 = waitQuantile(c.servers, arrive, c.serviceRate, 0.95) + 1 / c.serviceRate;
      } else {
        meanLatency = keep / capacity + 1 / c.serviceRate;
        p95 = meanLatency;
      }
      const ownFailure = arrive > 0 ? Math.min(1, dropped / arrive) : dropped > 0 ? 1 : 0;
      response.set(id, meanLatency);
      nodes[id] = { arrivals: arrive, served, dropped, backlog: keep, rho, meanLatency, p95Latency: p95, failure: ownFailure };
      for (const e of this.outgoing.get(id) ?? []) {
        const attempts = attemptsPerCall(this.lastFailure.get(e.to) ?? 0, e.retries);
        arrivals.set(e.to, (arrivals.get(e.to) ?? 0) + served * e.weight * attempts);
      }
    }

    // Backward pass: a request succeeds if this component and every call it makes succeed.
    const success = new Map<string, number>();
    const latency = new Map<string, number>();
    for (const id of [...this.order].reverse()) {
      const node = nodes[id];
      let s = 1 - node.failure;
      let l = response.get(id) ?? 0;
      for (const e of this.outgoing.get(id) ?? []) {
        const child = success.get(e.to) ?? 1;
        const callSuccess = 1 - Math.pow(1 - child, e.retries + 1);
        s *= 1 - e.weight + e.weight * callSuccess;
        l += e.weight * (2 * e.latency + (latency.get(e.to) ?? 0));
      }
      success.set(id, s);
      latency.set(id, l);
      node.failure = 1 - s;
    }
    for (const id of this.order) this.lastFailure.set(id, nodes[id].failure);

    const entry = this.topology.entry;
    const goodput = offered * (success.get(entry) ?? 1);
    const result: TickResult = {
      t: this.time,
      offered,
      goodput,
      errors: offered - goodput,
      meanLatency: latency.get(entry) ?? 0,
      nodes,
    };
    this.time += 1;
    return result;
  }

  run(seconds: number): TickResult[] {
    const out: TickResult[] = [];
    for (let i = 0; i < seconds; i++) out.push(this.step());
    return out;
  }
}
