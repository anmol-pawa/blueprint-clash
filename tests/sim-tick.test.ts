import { describe, expect, it } from "vitest";
import { mmc } from "@/lib/sim/queueing";
import { Simulation, attemptsPerCall } from "@/lib/sim/tick";
import { piecewiseRate, topologicalOrder, type ComponentSpec, type Topology } from "@/lib/sim/topology";

const comp = (id: string, o: Partial<ComponentSpec> = {}): ComponentSpec => ({
  id,
  servers: 2,
  serviceRate: 50,
  queueLimit: 1e9,
  timeout: 1e9,
  ...o,
});
const single = (o: Partial<ComponentSpec> = {}): Topology => ({ entry: "web", components: [comp("web", o)], edges: [] });
const flat = (rate: number) => piecewiseRate([{ from: 0, rate }]);

describe("topology validation", () => {
  it("orders callers before callees", () => {
    const t: Topology = {
      entry: "a",
      components: [comp("a"), comp("b"), comp("c")],
      edges: [
        { from: "a", to: "c", weight: 1, latency: 0, retries: 0 },
        { from: "c", to: "b", weight: 1, latency: 0, retries: 0 },
      ],
    };
    expect(topologicalOrder(t)).toEqual(["a", "c", "b"]);
  });
  it("rejects cycles, unknown ids, duplicates and bad numbers", () => {
    const e = (from: string, to: string) => ({ from, to, weight: 1, latency: 0, retries: 0 });
    expect(() => topologicalOrder({ entry: "a", components: [comp("a"), comp("b")], edges: [e("a", "b"), e("b", "a")] })).toThrow(/cycle/);
    expect(() => topologicalOrder({ entry: "a", components: [comp("a")], edges: [e("a", "z")] })).toThrow(/unknown/);
    expect(() => topologicalOrder({ entry: "x", components: [comp("a")], edges: [] })).toThrow(/entry/);
    expect(() => topologicalOrder({ entry: "a", components: [comp("a"), comp("a")], edges: [] })).toThrow(/duplicate/);
    expect(() => topologicalOrder(single({ servers: 0 }))).toThrow(RangeError);
    expect(() => topologicalOrder({ entry: "a", components: [comp("a"), comp("b")], edges: [{ ...e("a", "b"), weight: 2 }] })).toThrow(RangeError);
  });
  it("piecewiseRate is a step function", () => {
    const r = piecewiseRate([{ from: 10, rate: 5 }, { from: 0, rate: 1 }, { from: 20, rate: 0 }]);
    expect([r(-1), r(0), r(9), r(10), r(19), r(20)]).toEqual([0, 1, 1, 5, 5, 0]);
  });
});

describe("one component", () => {
  it("below saturation the tick latency equals the M/M/c closed form and nothing queues", () => {
    const [r] = new Simulation(single(), flat(80)).run(1);
    const want = mmc(2, 80, 50).meanResponse;
    expect(r.nodes.web.meanLatency).toBeCloseTo(want, 12);
    expect(r.meanLatency).toBeCloseTo(want, 12);
    expect(r.goodput).toBe(80);
    expect(r.errors).toBe(0);
    expect(r.nodes.web.backlog).toBe(0);
  });

  it("an unbounded queue under overload grows by lambda - c*mu per tick and conserves requests", () => {
    const rs = new Simulation(single(), flat(150)).run(10);
    rs.forEach((r, i) => expect(r.nodes.web.backlog).toBeCloseTo(50 * (i + 1), 9));
    let arrived = 0;
    let served = 0;
    for (const r of rs) {
      arrived += r.nodes.web.arrivals;
      served += r.nodes.web.served;
    }
    expect(arrived).toBeCloseTo(served + rs[9].nodes.web.backlog, 9);
    // The wait grows with the backlog: drain time = backlog / (c mu).
    expect(rs[9].nodes.web.meanLatency).toBeCloseTo(500 / 100 + 1 / 50, 9);
  });

  it("a timeout caps the backlog and turns the excess into errors", () => {
    const rs = new Simulation(single({ timeout: 0.5 }), flat(150)).run(30);
    const last = rs[29];
    expect(last.nodes.web.backlog).toBeCloseTo(50, 9); // timeout x capacity
    expect(last.nodes.web.dropped).toBeCloseTo(50, 9);
    expect(last.errors).toBeCloseTo(50, 9);
    expect(last.goodput).toBeCloseTo(100, 9);
    expect(last.nodes.web.meanLatency).toBeLessThanOrEqual(0.5 + 1 / 50 + 1e-9);
  });

  it("a spike builds a backlog that drains after the spike ends", () => {
    const rate = piecewiseRate([{ from: 0, rate: 50 }, { from: 5, rate: 300 }, { from: 8, rate: 50 }]);
    const rs = new Simulation(single(), rate).run(40);
    const peak = Math.max(...rs.map((r) => r.nodes.web.backlog));
    expect(peak).toBeCloseTo(600, 9); // 3 ticks x (300 - 100)
    expect(rs[39].nodes.web.backlog).toBe(0);
  });
});

describe("a call graph", () => {
  const web_db = (retries: number, db: Partial<ComponentSpec>, weight = 1): Topology => ({
    entry: "web",
    components: [comp("web", { servers: 100, serviceRate: 1000 }), comp("db", db)],
    edges: [{ from: "web", to: "db", weight, latency: 0.001, retries }],
  });

  it("end-to-end latency adds the weighted network and callee time", () => {
    const [r] = new Simulation(web_db(0, { servers: 4, serviceRate: 100 }, 0.2), flat(1000)).run(1);
    const want = r.nodes.web.meanLatency + 0.2 * (2 * 0.001 + r.nodes.db.meanLatency);
    expect(r.meanLatency).toBeCloseTo(want, 12);
    expect(r.nodes.db.arrivals).toBeCloseTo(200, 12);
  });

  it("attemptsPerCall is the geometric sum", () => {
    expect(attemptsPerCall(0.5, 2)).toBeCloseTo(1.75, 12);
    expect(attemptsPerCall(0, 5)).toBe(1);
    expect(attemptsPerCall(1, 3)).toBe(4);
  });

  it("retry amplification settles at the fixed point f = 1 - C / (lambda * attempts(f))", () => {
    const lambda = 100;
    const capacity = 80;
    const retries = 2;
    // Independent solution by bisection of g(f) = f - (1 - C / (lambda a(f))), increasing in f.
    const g = (f: number) => f - (1 - capacity / (lambda * (1 + f + f * f)));
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (g(mid) < 0) lo = mid;
      else hi = mid;
    }
    const f = lo;
    const sim = new Simulation(web_db(retries, { servers: 1, serviceRate: capacity, queueLimit: 0 }), flat(lambda));
    const last = sim.run(200)[199];
    expect(last.nodes.db.failure).toBeCloseTo(f, 6);
    expect(last.nodes.db.arrivals).toBeCloseTo(lambda * (1 + f + f * f), 4);
    // Without retries the database would see exactly lambda, and fail 1 - C / lambda.
    const plain = new Simulation(web_db(0, { servers: 1, serviceRate: capacity, queueLimit: 0 }), flat(lambda)).run(50)[49];
    expect(plain.nodes.db.arrivals).toBeCloseTo(lambda, 9);
    expect(plain.nodes.db.failure).toBeCloseTo(0.2, 9);
    expect(last.nodes.db.arrivals).toBeGreaterThan(plain.nodes.db.arrivals);
  });

  it("retries help a brief blip and the load they add drops back when the callee recovers", () => {
    const rate = piecewiseRate([{ from: 0, rate: 60 }, { from: 10, rate: 200 }, { from: 15, rate: 60 }]);
    const sim = new Simulation(web_db(2, { servers: 1, serviceRate: 80, queueLimit: 0 }), rate);
    const rs = sim.run(40);
    expect(rs[12].nodes.db.arrivals).toBeGreaterThan(200); // storm: amplified above the offered rate
    expect(rs[39].nodes.db.arrivals).toBeCloseTo(60, 9);
    expect(rs[39].errors).toBe(0);
  });

  it("is deterministic: the same inputs give identical results", () => {
    const run = () => new Simulation(web_db(2, { servers: 2, serviceRate: 70, timeout: 0.3 }), flat(220)).run(60);
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it("conserves requests at every node on every tick", () => {
    const sim = new Simulation(web_db(1, { servers: 1, serviceRate: 90, queueLimit: 40, timeout: 0.4 }), flat(150));
    let prev = 0;
    for (const r of sim.run(50)) {
      const n = r.nodes.db;
      expect(prev + n.arrivals).toBeCloseTo(n.served + n.dropped + n.backlog, 9);
      prev = n.backlog;
    }
  });
});
