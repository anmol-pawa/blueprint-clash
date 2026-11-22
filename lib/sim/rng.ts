// Seeded RNG (mulberry32). Same seed gives the same stream, which the simulator's
// determinism guarantee (ARCH §4) rests on.
export class Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  /** Uniform in (0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return u === 0 ? 1 / 4294967296 : u;
  }
  /** Exponential with the given rate. */
  exp(rate: number): number {
    return -Math.log(this.next()) / rate;
  }
}
