// Estimation solvers (ARCH §6). Pure functions: every Fermi Forge answer derives from these.
// All sizes are decimal (1 KB = 1e3 bytes) unless a name says "Bi" (binary). Figures are
// back-of-envelope arithmetic, not vendor numbers.

export const SECONDS_PER_DAY = 86_400;
export const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

/** Average requests per second from a daily total. */
export function qpsFromDaily(requestsPerDay: number): number {
  return requestsPerDay / SECONDS_PER_DAY;
}

/** Peak QPS = average x peak factor (diurnal traffic is commonly 2x to 5x its mean). */
export function peakQps(avgQps: number, peakFactor: number): number {
  return avgQps * peakFactor;
}

/** Daily active users x actions per user per day -> average QPS. */
export function qpsFromUsers(dau: number, actionsPerUserPerDay: number): number {
  return qpsFromDaily(dau * actionsPerUserPerDay);
}

/** Bytes stored over `years`, given writes per day, bytes per record and a replication factor. */
export function storageBytes(
  writesPerDay: number,
  bytesPerRecord: number,
  years: number,
  replication = 1,
): number {
  return writesPerDay * bytesPerRecord * 365 * years * replication;
}

/** Egress/ingress bandwidth in bits per second for a QPS and a payload size. */
export function bandwidthBitsPerSecond(qps: number, bytesPerRequest: number): number {
  return qps * bytesPerRequest * 8;
}

/** Servers needed for a QPS given per-server capacity and a target utilisation (headroom). */
export function serversNeeded(qps: number, perServerQps: number, targetUtilisation = 0.6): number {
  if (perServerQps <= 0 || targetUtilisation <= 0 || targetUtilisation > 1) {
    throw new RangeError("capacity and utilisation must be positive, utilisation at most 1");
  }
  return Math.ceil(qps / (perServerQps * targetUtilisation));
}

/** Shards needed so neither the data size nor the write rate exceeds one shard's limit. */
export function shardsNeeded(
  totalBytes: number,
  bytesPerShard: number,
  writeQps: number,
  writeQpsPerShard: number,
): number {
  return Math.max(Math.ceil(totalBytes / bytesPerShard), Math.ceil(writeQps / writeQpsPerShard), 1);
}

/** Cache memory for the hot set: `hotFraction` of `totalItems`, each `bytesPerItem` with overhead. */
export function cacheBytes(
  totalItems: number,
  hotFraction: number,
  bytesPerItem: number,
  overheadFactor = 1.3,
): number {
  return totalItems * hotFraction * bytesPerItem * overheadFactor;
}

/** Allowed downtime in seconds per year for an availability such as 0.9995. */
export function downtimePerYearSeconds(availability: number): number {
  if (availability < 0 || availability > 1) throw new RangeError("availability must be in [0, 1]");
  return (1 - availability) * SECONDS_PER_YEAR;
}

/** Inverse: availability for a downtime budget per year. */
export function availabilityFromDowntime(downtimeSecondsPerYear: number): number {
  return 1 - downtimeSecondsPerYear / SECONDS_PER_YEAR;
}

/** Serial dependencies multiply; every one must be up. */
export function availabilitySeries(parts: readonly number[]): number {
  return parts.reduce((a, p) => a * p, 1);
}

/** Redundant copies: the system is down only if all are down (independent failures assumed). */
export function availabilityParallel(parts: readonly number[]): number {
  return 1 - parts.reduce((a, p) => a * (1 - p), 1);
}

/** Bloom filter false-positive rate for m bits, n items, k hashes: (1 - e^(-kn/m))^k. */
export function bloomFalsePositiveRate(mBits: number, n: number, k: number): number {
  return Math.pow(1 - Math.exp((-k * n) / mBits), k);
}

/** Bits needed for n items at target false-positive rate p (with the optimal k). */
export function bloomBitsFor(n: number, p: number): number {
  return Math.ceil((-n * Math.log(p)) / (Math.LN2 * Math.LN2));
}

/** Optimal hash count for m bits and n items. */
export function bloomOptimalK(mBits: number, n: number): number {
  return Math.max(1, Math.round((mBits / n) * Math.LN2));
}

/** HyperLogLog standard error with 2^precision registers: 1.04 / sqrt(m). */
export function hllStdError(precision: number): number {
  return 1.04 / Math.sqrt(Math.pow(2, precision));
}

/** Human-readable decimal size, e.g. 1.5e12 -> "1.5 TB". */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];
  let v = bytes;
  let i = 0;
  while (Math.abs(v) >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${Number.isInteger(v) ? v : v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}
