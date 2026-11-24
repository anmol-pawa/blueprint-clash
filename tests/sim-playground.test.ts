import { describe, expect, it } from "vitest";
import { cloneScenario, PRESETS, presetById } from "@/lib/sim/presets";
import { runScenario } from "@/lib/sim/run";
import { topologicalOrder } from "@/lib/sim/topology";

const run = (id: string, edit?: (s: ReturnType<typeof cloneScenario>) => void) => {
  const s = cloneScenario(presetById(id)!);
  edit?.(s);
  return runScenario(s);
};

describe("playground presets", () => {
  it("every preset is a valid topology with a unique id", () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    for (const p of PRESETS) expect(() => topologicalOrder(p.topology)).not.toThrow();
  });

  it("cloneScenario does not share state with the constant", () => {
    const c = cloneScenario(PRESETS[0]);
    c.topology.components[0].servers = 99;
    expect(PRESETS[0].topology.components[0].servers).not.toBe(99);
  });

  it("runs are deterministic and series have one point per second", () => {
    for (const p of PRESETS) {
      const a = runScenario(p);
      expect(runScenario(p)).toEqual(a);
      expect(a.series.t).toHaveLength(p.seconds);
      for (const id of Object.keys(a.series.nodes)) expect(a.series.nodes[id].rho).toHaveLength(p.seconds);
    }
  });

  it("goodput plus errors equals offered every tick", () => {
    for (const p of PRESETS) {
      const { series } = runScenario(p);
      series.t.forEach((_, i) => expect(series.goodput[i] + series.errors[i]).toBeCloseTo(series.offered[i], 6));
    }
  });
});

describe("preset lessons hold in the model", () => {
  it("single: backlog grows by (λ − cμ) per second above capacity and drains after", () => {
    const { series, summary } = run("single");
    // 215 rps against 4 × 50 = 200: 15 more queued each second from t = 40 to 59
    expect(series.backlog[45] - series.backlog[44]).toBeCloseTo(15, 6);
    expect(summary.peakBacklog).toBeCloseTo(300, 6);
    expect(series.backlog[70]).toBe(0);
    expect(summary.unhealthyTicks).toBe(0);
  });

  it("web-db: the database is the hottest tier and caps goodput", () => {
    const { series, summary } = run("web-db");
    expect(summary.hottest.id).toBe("db");
    expect(series.goodput[50]).toBeCloseTo(480, 6);
    const more = run("web-db", (s) => (s.topology.components[0].servers = 32));
    expect(more.series.goodput[50]).toBeCloseTo(480, 6);
  });

  it("cache-aside: healthy at a 0.1 miss ratio, overloaded at 0.3", () => {
    expect(run("cache-aside").summary.unhealthyTicks).toBe(0);
    const worse = run("cache-aside", (s) => (s.topology.edges.find((e) => e.to === "db")!.weight = 0.3));
    expect(worse.summary.hottest.id).toBe("db");
    expect(worse.summary.hottest.rho).toBeGreaterThan(2);
    expect(worse.summary.successRatio).toBeLessThan(0.95);
  });

  it("retry-storm: three retries amplify the spike to about 4× capacity, goodput stays capped", () => {
    const three = run("retry-storm");
    const none = run("retry-storm", (s) => (s.topology.edges[0].retries = 0));
    expect(none.summary.hottest.rho).toBeCloseTo(1.5, 6);
    expect(three.summary.hottest.rho).toBeGreaterThan(3.5);
    expect(three.summary.hottest.rho).toBeLessThan(4.5);
    for (const r of [none, three]) expect(Math.max(...r.series.goodput.slice(22, 30))).toBeLessThanOrEqual(600);
    expect(three.series.goodput[29]).toBeCloseTo(400, 0);
    // retry load lingers: at t = 30 offered is back to 300 (ρ 0.75) but orders still sees more
    expect(three.series.nodes.orders.rho[30]).toBeGreaterThan(1.5);
    expect(none.series.nodes.orders.rho[30]).toBeCloseTo(0.75, 6);
    expect(three.series.nodes.orders.rho[40]).toBeCloseTo(0.75, 6);
  });
});

describe("performance budget (ARCH §4)", () => {
  it("a 10-minute wave over 20 components runs well inside 2 s", () => {
    const components = Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, servers: 4, serviceRate: 100, queueLimit: 500, timeout: 2 }));
    const edges = components.slice(1).map((c, i) => ({ from: components[i].id, to: c.id, weight: 0.9, latency: 0.001, retries: 2 }));
    const scenario = { id: "perf", name: "perf", lesson: "", seconds: 600, topology: { entry: "c0", components, edges }, traffic: [{ from: 0, rate: 300 }, { from: 200, rate: 500 }, { from: 300, rate: 300 }] };
    const started = performance.now();
    const { series } = runScenario(scenario);
    expect(series.t).toHaveLength(600);
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
