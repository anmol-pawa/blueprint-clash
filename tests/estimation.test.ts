import { describe, expect, it } from "vitest";
import {
  availabilityFromDowntime, availabilityParallel, availabilitySeries, bandwidthBitsPerSecond,
  bloomBitsFor, bloomFalsePositiveRate, bloomOptimalK, cacheBytes, downtimePerYearSeconds,
  formatBytes, hllStdError, peakQps, qpsFromDaily, qpsFromUsers, serversNeeded, shardsNeeded,
  storageBytes,
} from "@/lib/estimation";

describe("traffic and storage", () => {
  it("100M requests a day is about 1157 QPS; peak 3x", () => {
    expect(qpsFromDaily(100e6)).toBeCloseTo(1157.4, 1);
    expect(peakQps(qpsFromDaily(100e6), 3)).toBeCloseTo(3472.2, 1);
    expect(qpsFromUsers(10e6, 10)).toBeCloseTo(1157.4, 1);
  });
  it("500M writes/day x 1 KB x 5 years x 3 replicas = 2.73 PB", () => {
    const b = storageBytes(500e6, 1000, 5, 3);
    expect(b).toBeCloseTo(2.7375e15, -9);
    expect(formatBytes(b)).toBe("2.74 PB");
  });
  it("bandwidth: 2000 QPS x 500 KB = 8 Gbit/s", () => {
    expect(bandwidthBitsPerSecond(2000, 500e3)).toBe(8e9);
  });
  it("fleet, shard and cache sizing", () => {
    expect(serversNeeded(10_000, 500, 0.5)).toBe(40);
    expect(() => serversNeeded(1, 0)).toThrow(RangeError);
    expect(shardsNeeded(10e12, 2e12, 3000, 1000)).toBe(5);
    expect(shardsNeeded(1e9, 2e12, 9000, 1000)).toBe(9);
    expect(cacheBytes(1e9, 0.2, 1000, 1.5)).toBe(3e11);
  });
});

describe("availability", () => {
  it("nines to downtime", () => {
    expect(downtimePerYearSeconds(0.999) / 3600).toBeCloseTo(8.76, 2);
    expect(downtimePerYearSeconds(0.99999) / 60).toBeCloseTo(5.256, 3);
    expect(availabilityFromDowntime(downtimePerYearSeconds(0.9995))).toBeCloseTo(0.9995, 12);
    expect(() => downtimePerYearSeconds(1.2)).toThrow(RangeError);
  });
  it("series multiplies, parallel redundancy shrinks the failure probability", () => {
    expect(availabilitySeries([0.999, 0.999, 0.999])).toBeCloseTo(0.997003, 6);
    expect(availabilityParallel([0.99, 0.99])).toBeCloseTo(0.9999, 12);
  });
});

describe("probabilistic structures", () => {
  it("Bloom filter: 1% target needs about 9.6 bits per item and k = 7", () => {
    const n = 1e6;
    const m = bloomBitsFor(n, 0.01);
    expect(m / n).toBeCloseTo(9.585, 2);
    const k = bloomOptimalK(m, n);
    expect(k).toBe(7);
    expect(bloomFalsePositiveRate(m, n, k)).toBeCloseTo(0.01, 2);
  });
  it("Bloom false positives grow as the filter fills", () => {
    expect(bloomFalsePositiveRate(1e6, 2e5, 5)).toBeLessThan(bloomFalsePositiveRate(1e6, 4e5, 5));
  });
  it("HyperLogLog: precision 14 is about 0.81 percent error", () => {
    expect(hllStdError(14)).toBeCloseTo(0.0081, 4);
  });
});
