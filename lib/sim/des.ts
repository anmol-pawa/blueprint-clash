// Small discrete-event simulator of an M/M/c FCFS queue, used only to validate the
// analytic model (ARCH §4). Not used at runtime in the Siege.
import { Rng } from "./rng";

export interface DesResult {
  served: number;
  meanWait: number;
  meanResponse: number;
  /** Time-average number in system, measured by integrating the count (independent of W). */
  meanInSystem: number;
  /** Fraction of customers that waited at all. */
  waitFraction: number;
  /** Observed throughput over the measured window. */
  throughput: number;
}

export function simulateMMc(
  c: number,
  lambda: number,
  mu: number,
  customers: number,
  seed: number,
  warmup = Math.floor(customers / 10),
): DesResult {
  const rng = new Rng(seed);
  // freeAt[i] = time server i becomes free; FCFS assigns each arrival to the earliest.
  const freeAt = new Array<number>(c).fill(0);
  const events: { t: number; d: number }[] = []; // +1 at arrival, -1 at departure, all customers, so warm-up leftovers are counted
  let t = 0;
  let sumWait = 0;
  let sumResp = 0;
  let waited = 0;
  let measured = 0;
  let windowStart = 0;
  let windowEnd = 0;
  for (let i = 0; i < customers; i++) {
    t += rng.exp(lambda);
    let idx = 0;
    for (let s = 1; s < c; s++) if (freeAt[s] < freeAt[idx]) idx = s;
    const start = Math.max(t, freeAt[idx]);
    const done = start + rng.exp(mu);
    freeAt[idx] = done;
    if (i === warmup) windowStart = t;
    if (i >= warmup) {
      measured++;
      sumWait += start - t;
      sumResp += done - t;
      if (start > t) waited++;
      windowEnd = Math.max(windowEnd, t);
    }
    events.push({ t, d: 1 }, { t: done, d: -1 }); // everyone counts toward the head count
  }
  // Integrate the number in system over [windowStart, windowEnd].
  events.sort((a, b) => a.t - b.t);
  let n = 0;
  let area = 0;
  let last = windowStart;
  for (const e of events) {
    if (e.t > windowEnd) break;
    if (e.t > windowStart) {
      area += n * (e.t - last);
      last = e.t;
    }
    n += e.d;
  }
  const span = windowEnd - windowStart;
  return {
    served: measured,
    meanWait: sumWait / measured,
    meanResponse: sumResp / measured,
    meanInSystem: area / span,
    waitFraction: waited / measured,
    throughput: measured / span,
  };
}
