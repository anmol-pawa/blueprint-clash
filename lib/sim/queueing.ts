// Analytic queueing (ARCH §4): M/M/1 and M/M/c via Erlang C, used for per-component latency.
// λ = arrival rate, μ = per-server service rate, c = servers. Times are in seconds.

export interface QueueStats {
  /** Utilisation ρ = λ / (c·μ). */
  rho: number;
  /** Probability an arrival has to wait (Erlang C). 1 when unstable. */
  waitProbability: number;
  /** Mean time in queue Wq. Infinity when ρ >= 1. */
  meanWait: number;
  /** Mean time in system W = Wq + 1/μ. */
  meanResponse: number;
  /** Mean number waiting Lq. */
  meanQueueLength: number;
  /** Mean number in system L. */
  meanInSystem: number;
}

/** Erlang C: probability of waiting in an M/M/c queue. Uses a stable Erlang-B recurrence. */
export function erlangC(c: number, lambda: number, mu: number): number {
  if (!Number.isInteger(c) || c < 1) throw new RangeError("c must be a positive integer");
  const a = lambda / mu; // offered load in erlangs
  const rho = a / c;
  if (rho >= 1) return 1;
  let b = 1; // Erlang B with 0 servers
  for (let k = 1; k <= c; k++) b = (a * b) / (k + a * b);
  return b / (1 - rho * (1 - b));
}

export function mmc(c: number, lambda: number, mu: number): QueueStats {
  if (mu <= 0 || lambda < 0) throw new RangeError("mu must be positive and lambda non-negative");
  const rho = lambda / (c * mu);
  if (rho >= 1) {
    return {
      rho,
      waitProbability: 1,
      meanWait: Infinity,
      meanResponse: Infinity,
      meanQueueLength: Infinity,
      meanInSystem: Infinity,
    };
  }
  const pw = erlangC(c, lambda, mu);
  const meanWait = pw / (c * mu - lambda);
  const meanResponse = meanWait + 1 / mu;
  return {
    rho,
    waitProbability: pw,
    meanWait,
    meanResponse,
    meanQueueLength: lambda * meanWait,
    meanInSystem: lambda * meanResponse,
  };
}

export function mm1(lambda: number, mu: number): QueueStats {
  return mmc(1, lambda, mu);
}

/** P(Wq > t) for M/M/c: Erlang C x e^(-(cμ-λ)t). */
export function waitExceeds(c: number, lambda: number, mu: number, t: number): number {
  if (lambda >= c * mu) return 1;
  return erlangC(c, lambda, mu) * Math.exp(-(c * mu - lambda) * t);
}

/** The q-quantile of queueing delay (0 when q <= 1 - P(wait)). Basis for p95/p99 per component. */
export function waitQuantile(c: number, lambda: number, mu: number, q: number): number {
  if (q <= 0 || q >= 1) throw new RangeError("q must be in (0, 1)");
  if (lambda >= c * mu) return Infinity;
  const pw = erlangC(c, lambda, mu);
  if (q <= 1 - pw) return 0;
  return Math.log(pw / (1 - q)) / (c * mu - lambda);
}

/** Little's law: L = λ W. */
export function littlesLaw(lambda: number, w: number): number {
  return lambda * w;
}
