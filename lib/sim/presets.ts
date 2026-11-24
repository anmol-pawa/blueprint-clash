// Preset scenarios for the /dev/sim playground (ARCH §4). Pure data: a topology plus a
// piecewise traffic profile. Every number is illustrative (a teaching model, not a benchmark).
import type { RateStep, Topology } from "./topology";

export interface Scenario {
  id: string;
  name: string;
  /** One line on what the preset shows. */
  lesson: string;
  topology: Topology;
  traffic: RateStep[];
  /** Simulated seconds to run. */
  seconds: number;
}

export const PRESETS: readonly Scenario[] = [
  {
    id: "single",
    name: "One server, rising load",
    lesson: "Latency stays flat until utilisation nears 1, then the queue grows every second the load stays above capacity.",
    topology: {
      entry: "api",
      components: [{ id: "api", servers: 4, serviceRate: 50, queueLimit: 2000, timeout: 5 }],
      edges: [],
    },
    traffic: [
      { from: 0, rate: 120 },
      { from: 20, rate: 180 },
      { from: 40, rate: 215 },
      { from: 60, rate: 120 },
    ],
    seconds: 100,
  },
  {
    id: "web-db",
    name: "Web tier and a database",
    lesson: "The slowest tier sets the ceiling: adding web servers does nothing once the database is saturated.",
    topology: {
      entry: "web",
      components: [
        { id: "web", servers: 8, serviceRate: 100, queueLimit: 4000, timeout: 3 },
        { id: "db", servers: 4, serviceRate: 120, queueLimit: 1000, timeout: 2 },
      ],
      edges: [{ from: "web", to: "db", weight: 1, latency: 0.001, retries: 0 }],
    },
    traffic: [
      { from: 0, rate: 300 },
      { from: 30, rate: 550 },
      { from: 70, rate: 300 },
    ],
    seconds: 110,
  },
  {
    id: "cache-aside",
    name: "Cache in front of the database",
    lesson: "With a 90 % hit ratio only 10 % of reads reach the database. Raise the api→db weight (the miss ratio) from 0.1 to 0.3 and the same traffic overloads it.",
    topology: {
      entry: "api",
      components: [
        { id: "api", servers: 8, serviceRate: 200, queueLimit: 4000, timeout: 3 },
        { id: "cache", servers: 4, serviceRate: 2000, queueLimit: 4000, timeout: 1 },
        { id: "db", servers: 2, serviceRate: 100, queueLimit: 400, timeout: 2 },
      ],
      edges: [
        { from: "api", to: "cache", weight: 1, latency: 0.0005, retries: 0 },
        { from: "api", to: "db", weight: 0.1, latency: 0.001, retries: 0 },
      ],
    },
    traffic: [
      { from: 0, rate: 800 },
      { from: 40, rate: 1400 },
      { from: 80, rate: 800 },
    ],
    seconds: 120,
  },
  {
    id: "retry-storm",
    name: "Retry storm after a spike",
    lesson: "A spike to 1.5× the capacity of orders becomes about 4× once three retries pile on, yet goodput stays capped at capacity, and the retry load lingers after traffic falls. Set retries to 0 to compare. (This fluid model wastes no work on abandoned calls, so it recovers; real systems can stay down.)",
    topology: {
      entry: "gateway",
      components: [
        { id: "gateway", servers: 16, serviceRate: 200, queueLimit: 8000, timeout: 5 },
        { id: "orders", servers: 4, serviceRate: 100, queueLimit: 200, timeout: 1 },
      ],
      edges: [{ from: "gateway", to: "orders", weight: 1, latency: 0.002, retries: 3 }],
    },
    traffic: [
      { from: 0, rate: 300 },
      { from: 20, rate: 600 },
      { from: 30, rate: 300 },
    ],
    seconds: 90,
  },
];

export function presetById(id: string): Scenario | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** Deep copy so the playground can edit a preset without mutating the shared constant. */
export function cloneScenario(s: Scenario): Scenario {
  return JSON.parse(JSON.stringify(s)) as Scenario;
}
