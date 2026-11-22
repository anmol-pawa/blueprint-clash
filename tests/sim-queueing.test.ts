import { describe, expect, it } from "vitest";
import { erlangC, littlesLaw, mm1, mmc, waitExceeds, waitQuantile } from "@/lib/sim/queueing";
import { simulateMMc } from "@/lib/sim/des";
import { Rng } from "@/lib/sim/rng";

const within = (actual: number, expected: number, tol: number) =>
  Math.abs(actual - expected) <= tol * Math.abs(expected);

describe("Erlang C and M/M/c closed forms", () => {
  it("M/M/1: Wq = rho / (mu - lambda), W = 1 / (mu - lambda), P(wait) = rho", () => {
    const s = mm1(8, 10);
    expect(s.rho).toBeCloseTo(0.8, 12);
    expect(s.waitProbability).toBeCloseTo(0.8, 12);
    expect(s.meanWait).toBeCloseTo(0.8 / 2, 12);
    expect(s.meanResponse).toBeCloseTo(1 / 2, 12);
  });

  it("M/M/2 matches the hand-derived value (lambda 1.5, mu 1: C = 9/14)", () => {
    expect(erlangC(2, 1.5, 1)).toBeCloseTo(9 / 14, 12);
    expect(mmc(2, 1.5, 1).meanWait).toBeCloseTo(9 / 14 / (2 - 1.5), 12);
  });

  it("matches the textbook series sum for several c", () => {
    for (const [c, lambda, mu] of [[3, 2.4, 1], [5, 4, 1], [10, 8.5, 1], [20, 17, 1]] as const) {
      const a = lambda / mu;
      const rho = a / c;
      let sum = 0;
      let term = 1;
      for (let k = 0; k < c; k++) {
        sum += term;
        term *= a / (k + 1);
      }
      const top = term / (1 - rho); // a^c / c! / (1 - rho)
      expect(erlangC(c, lambda, mu)).toBeCloseTo(top / (sum + top), 10);
    }
  });

  it("is stable for large c (no overflow) and monotone in load", () => {
    expect(Number.isFinite(erlangC(500, 450, 1))).toBe(true);
    let prev = 0;
    for (const lambda of [100, 200, 300, 400, 480]) {
      const p = erlangC(500, lambda, 1);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });

  it("reports an unstable queue as infinite", () => {
    expect(mmc(2, 2, 1).meanWait).toBe(Infinity);
    expect(waitQuantile(2, 3, 1, 0.99)).toBe(Infinity);
  });

  it("wait quantile inverts the tail probability", () => {
    const [c, lambda, mu] = [4, 3.4, 1];
    const t = waitQuantile(c, lambda, mu, 0.99);
    expect(waitExceeds(c, lambda, mu, t)).toBeCloseTo(0.01, 10);
    expect(waitQuantile(c, lambda, mu, 0.01)).toBe(0); // most arrivals do not wait at all
  });

  it("pooling beats splitting: one M/M/2 waits less than two M/M/1 at the same load", () => {
    expect(mmc(2, 1.6, 1).meanWait).toBeLessThan(mm1(0.8, 1).meanWait);
  });
});

describe("discrete-event simulation validates the analytic model (within 5 percent)", () => {
  const cases: [number, number, number][] = [
    [1, 7, 10],
    [2, 15, 10],
    [4, 34, 10],
  ];
  for (const [c, lambda, mu] of cases) {
    it(`M/M/${c} at rho ${(lambda / (c * mu)).toFixed(2)}`, () => {
      const exact = mmc(c, lambda, mu);
      const sim = simulateMMc(c, lambda, mu, 600_000, 42 + c);
      expect(within(sim.meanWait, exact.meanWait, 0.05)).toBe(true);
      expect(within(sim.meanResponse, exact.meanResponse, 0.05)).toBe(true);
      expect(within(sim.waitFraction, exact.waitProbability, 0.05)).toBe(true);
      expect(within(sim.throughput, lambda, 0.02)).toBe(true);
    });
  }

  it("obeys Little's law: time-average head count = lambda x mean response", () => {
    const sim = simulateMMc(3, 24, 10, 400_000, 7);
    expect(within(sim.meanInSystem, littlesLaw(sim.throughput, sim.meanResponse), 0.02)).toBe(true);
    expect(within(sim.meanInSystem, mmc(3, 24, 10).meanInSystem, 0.05)).toBe(true);
  });

  it("is deterministic: the same seed gives identical results, another seed differs", () => {
    expect(simulateMMc(2, 15, 10, 5000, 1)).toEqual(simulateMMc(2, 15, 10, 5000, 1));
    expect(simulateMMc(2, 15, 10, 5000, 1).meanWait).not.toBe(simulateMMc(2, 15, 10, 5000, 2).meanWait);
  });
});

describe("Rng", () => {
  it("is uniform enough and exponential draws have mean 1/rate", () => {
    const r = new Rng(123);
    let sum = 0;
    for (let i = 0; i < 200_000; i++) sum += r.exp(4);
    expect(within(sum / 200_000, 0.25, 0.02)).toBe(true);
    const u = new Rng(5);
    for (let i = 0; i < 1000; i++) {
      const x = u.next();
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1);
    }
  });
});
