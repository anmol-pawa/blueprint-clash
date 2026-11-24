// Runs a scenario through the fluid tick model and flattens the result into chart series plus a
// summary. Pure: the playground calls it inside a Web Worker, tests call it directly.
import type { Scenario } from "./presets";
import { Simulation } from "./tick";
import { piecewiseRate } from "./topology";

/** Errors below this share of the offered load in a tick count as "healthy" for the summary. */
export const HEALTHY_ERROR_SHARE = 0.01;

export interface ScenarioSeries {
  t: number[];
  offered: number[];
  goodput: number[];
  errors: number[];
  /** Sum of every component's backlog at the end of the tick. */
  backlog: number[];
  /** Mean end-to-end latency, milliseconds. */
  latencyMs: number[];
  /** Per component: utilisation ρ (offered / capacity) and backlog. */
  nodes: Record<string, { rho: number[]; backlog: number[] }>;
}

export interface ScenarioSummary {
  offered: number;
  goodput: number;
  /** goodput / offered over the whole run (1 when nothing was offered). */
  successRatio: number;
  peakBacklog: number;
  peakLatencyMs: number;
  /** Component with the highest peak utilisation, and that peak. */
  hottest: { id: string; rho: number };
  /** Ticks in which more than HEALTHY_ERROR_SHARE of the offered load failed. */
  unhealthyTicks: number;
  /** Last unhealthy tick, or null when every tick was healthy. */
  lastUnhealthy: number | null;
}

export interface ScenarioRun {
  series: ScenarioSeries;
  summary: ScenarioSummary;
}

export function runScenario(scenario: Scenario): ScenarioRun {
  const sim = new Simulation(scenario.topology, piecewiseRate(scenario.traffic));
  const ids = scenario.topology.components.map((c) => c.id);
  const series: ScenarioSeries = {
    t: [],
    offered: [],
    goodput: [],
    errors: [],
    backlog: [],
    latencyMs: [],
    nodes: Object.fromEntries(ids.map((id) => [id, { rho: [], backlog: [] }])),
  };
  let offered = 0;
  let goodput = 0;
  let peakBacklog = 0;
  let peakLatencyMs = 0;
  let unhealthyTicks = 0;
  let lastUnhealthy: number | null = null;
  const hottest = { id: ids[0] ?? "", rho: 0 };

  for (const tick of sim.run(scenario.seconds)) {
    let backlog = 0;
    for (const id of ids) {
      const n = tick.nodes[id];
      backlog += n.backlog;
      series.nodes[id].rho.push(n.rho);
      series.nodes[id].backlog.push(n.backlog);
      if (n.rho > hottest.rho) Object.assign(hottest, { id, rho: n.rho });
    }
    const latencyMs = tick.meanLatency * 1000;
    series.t.push(tick.t);
    series.offered.push(tick.offered);
    series.goodput.push(tick.goodput);
    series.errors.push(tick.errors);
    series.backlog.push(backlog);
    series.latencyMs.push(latencyMs);
    offered += tick.offered;
    goodput += tick.goodput;
    peakBacklog = Math.max(peakBacklog, backlog);
    peakLatencyMs = Math.max(peakLatencyMs, latencyMs);
    if (tick.errors > HEALTHY_ERROR_SHARE * tick.offered) {
      unhealthyTicks += 1;
      lastUnhealthy = tick.t;
    }
  }
  return {
    series,
    summary: {
      offered,
      goodput,
      successRatio: offered > 0 ? goodput / offered : 1,
      peakBacklog,
      peakLatencyMs,
      hottest,
      unhealthyTicks,
      lastUnhealthy,
    },
  };
}
