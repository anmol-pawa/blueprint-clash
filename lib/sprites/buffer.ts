/**
 * Indexed pixel buffer and the small set of shaded primitives the creature
 * drawings are built from. Pure (no DOM, no Pixi): a sprite is a grid of palette
 * indices, index 0 is transparent. Rendering to canvas/Pixi lives elsewhere.
 */

export type Ramp = readonly [dark: number, shade: number, base: number, light: number];

export interface Light {
  x: number;
  y: number;
  z: number;
}

/** Light from the top-left, towards the viewer. */
export const TOP_LEFT: Light = { x: -0.5, y: -0.6, z: 0.62 };

export class PixelBuffer {
  readonly px: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.px = new Uint8Array(width * height);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): number {
    return this.inside(x, y) ? this.px[y * this.width + x] : 0;
  }

  set(x: number, y: number, c: number): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (this.inside(ix, iy)) this.px[iy * this.width + ix] = c;
  }

  opaqueCount(): number {
    let n = 0;
    for (const v of this.px) if (v !== 0) n++;
    return n;
  }

  /** Bounding box of opaque pixels, or null when empty. */
  bounds(): { x0: number; y0: number; x1: number; y1: number } | null {
    let x0 = this.width;
    let y0 = this.height;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.px[y * this.width + x] === 0) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }

  clone(): PixelBuffer {
    const b = new PixelBuffer(this.width, this.height);
    b.px.set(this.px);
    return b;
  }

  /** Mirror left-right (front sprite for the opponent side, etc.). */
  flipX(): PixelBuffer {
    const b = new PixelBuffer(this.width, this.height);
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) b.px[y * this.width + x] = this.px[y * this.width + (this.width - 1 - x)];
    return b;
  }
}

/** A lit ellipsoid: shade follows the surface normal, with a darker rim. */
export function fillEllipsoid(
  buf: PixelBuffer,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  ramp: Ramp,
  light: Light = TOP_LEFT,
): void {
  if (rx <= 0 || ry <= 0) return;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2);
      const d = nx * light.x + ny * light.y + nz * light.z;
      let level = d < 0.12 ? 0 : d < 0.42 ? 1 : d < 0.8 ? 2 : 3;
      if (r2 > 0.86) level = Math.max(0, level - 1);
      buf.set(x, y, ramp[level]);
    }
  }
}

/** Flat ellipse in one colour (eyes, cheeks, mouths). */
export function fillDisc(buf: PixelBuffer, cx: number, cy: number, rx: number, ry: number, c: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) buf.set(x, y, c);
    }
  }
}

export function fillRect(buf: PixelBuffer, x: number, y: number, w: number, h: number, c: number): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) buf.set(x + i, y + j, c);
}

/** Thick line made of stamped discs. */
export function stroke(buf: PixelBuffer, x0: number, y0: number, x1: number, y1: number, r: number, c: number): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillDisc(buf, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, c);
  }
}

/**
 * A pencil-shaped limb: wood shaft shaded across its width, tapering into a cone
 * whose last part is graphite. `angle` is degrees clockwise from straight up.
 */
export function pencil(
  buf: PixelBuffer,
  bx: number,
  by: number,
  angle: number,
  len: number,
  width: number,
  wood: Ramp,
  graphite: Ramp,
): void {
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const px = Math.cos(a);
  const py = Math.sin(a);
  const tipStart = len * 0.4;
  for (let t = 0; t <= len; t += 0.5) {
    const w = t < tipStart ? width : width * (1 - (t - tipStart) / (len - tipStart));
    for (let s = -w / 2; s <= w / 2; s += 0.5) {
      const rel = w > 0 ? s / (width / 2) : 0;
      const ramp = t > len * 0.72 ? graphite : wood;
      const level = rel < -0.55 ? 3 : rel < 0.1 ? 2 : rel < 0.7 ? 1 : 0;
      buf.set(bx + dx * t + px * s, by + dy * t + py * s, ramp[level]);
    }
  }
}

/**
 * Add a 1px outline in colour `c` on transparent pixels that touch an opaque
 * pixel (4-neighbourhood). Run last, so the silhouette always reads.
 */
export function outline(buf: PixelBuffer, c: number): void {
  const add: number[] = [];
  for (let y = 0; y < buf.height; y++) {
    for (let x = 0; x < buf.width; x++) {
      if (buf.get(x, y) !== 0) continue;
      if (buf.get(x - 1, y) || buf.get(x + 1, y) || buf.get(x, y - 1) || buf.get(x, y + 1)) add.push(y * buf.width + x);
    }
  }
  for (const i of add) buf.px[i] = c;
}

/** Replace every opaque pixel (hit flash / evolve silhouette). */
export function silhouette(buf: PixelBuffer, c: number): void {
  for (let i = 0; i < buf.px.length; i++) if (buf.px[i] !== 0) buf.px[i] = c;
}

/** Clear every row at or below `y` (sinking into the ground). */
export function clipBelow(buf: PixelBuffer, y: number): void {
  for (let j = Math.max(0, y); j < buf.height; j++) for (let i = 0; i < buf.width; i++) buf.px[j * buf.width + i] = 0;
}

export function toRgba(buf: PixelBuffer, palette: readonly string[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(buf.width * buf.height * 4);
  for (let i = 0; i < buf.px.length; i++) {
    const hex = palette[buf.px[i]];
    if (!hex) continue;
    const n = parseInt(hex.slice(1), 16);
    out[i * 4] = (n >> 16) & 255;
    out[i * 4 + 1] = (n >> 8) & 255;
    out[i * 4 + 2] = n & 255;
    out[i * 4 + 3] = 255;
  }
  return out;
}
