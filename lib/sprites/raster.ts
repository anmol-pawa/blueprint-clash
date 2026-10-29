/** Tiny indexed-colour raster toolkit for procedural pixel art. Index 0 is transparent. */

export interface Frame {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
}

/** Palette indices ordered dark -> light. */
export type Ramp = readonly number[];

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Ordered-dither threshold in (0,1) for a pixel, so shading bands blend like hand-placed dithering. */
export function bayer(x: number, y: number): number {
  return (BAYER4[y & 3][x & 3] + 0.5) / 16;
}

// Light comes from the upper left, towards the viewer.
const LIGHT = (() => {
  const v = [-0.45, -0.6, 0.66];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / n);
})();

export interface EllipseOpts {
  /** Replace the shaded colour of a pixel (for patterns such as grid lines). */
  recolor?: (x: number, y: number, shaded: number) => number;
}

export class Canvas {
  readonly px: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.px = new Uint8Array(w * h);
  }

  set(x: number, y: number, c: number): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    this.px[iy * this.w + ix] = c;
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.px[y * this.w + x];
  }

  /** A shaded (lit sphere style) ellipse using a colour ramp with ordered dithering between bands. */
  ellipse(cx: number, cy: number, rx: number, ry: number, ramp: Ramp, opts: EllipseOpts = {}): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const d2 = nx * nx + ny * ny;
        if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2);
        const lit = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
        const t = ((lit + 0.15) / 1.15) * ramp.length + (bayer(x, y) - 0.5) * 0.45;
        const shaded = ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t)))];
        this.set(x, y, opts.recolor ? opts.recolor(x, y, shaded) : shaded);
      }
    }
  }

  /** Flat ellipse of one colour. */
  flatEllipse(cx: number, cy: number, rx: number, ry: number, c: number): void {
    this.ellipse(cx, cy, rx, ry, [c]);
  }

  /**
   * A rotated bar from (x0,y0) to (x1,y1). `colorAt(u, v)` gets u in [0,1] along the bar
   * and v in [-1,1] across it; return 0 to leave the pixel empty.
   */
  bar(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    width: number,
    colorAt: (u: number, v: number) => number,
  ): void {
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const ax = (x1 - x0) / len;
    const ay = (y1 - y0) / len;
    const pad = Math.ceil(width / 2) + 1;
    const minX = Math.floor(Math.min(x0, x1) - pad);
    const maxX = Math.ceil(Math.max(x0, x1) + pad);
    const minY = Math.floor(Math.min(y0, y1) - pad);
    const maxY = Math.ceil(Math.max(y0, y1) + pad);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x + 0.5 - x0;
        const dy = y + 0.5 - y0;
        const u = dx * ax + dy * ay;
        const v = -dx * ay + dy * ax;
        if (u < 0 || u > len || Math.abs(v) > width / 2) continue;
        const c = colorAt(u / len, v / (width / 2));
        if (c > 0) this.set(x, y, c);
      }
    }
  }

  /** Dark 1px outline around everything drawn so far (grows the silhouette by one pixel). */
  outline(color: number): void {
    const out = new Uint8Array(this.px);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== 0) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) {
          out[y * this.w + x] = color;
        }
      }
    }
    this.px.set(out);
  }

  toFrame(): Frame {
    return { w: this.w, h: this.h, px: this.px.slice() };
  }
}

/** Frame with every visible pixel replaced by one colour (hit flash, evolve silhouette). */
export function silhouette(f: Frame, color: number): Frame {
  return { w: f.w, h: f.h, px: f.px.map((c) => (c ? color : 0)) };
}

/** Dissolve a frame with ordered dithering; amount 0 keeps everything, 1 removes everything. */
export function dissolve(f: Frame, amount: number): Frame {
  const px = f.px.slice();
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      if (bayer(x, y) < amount) px[y * f.w + x] = 0;
    }
  }
  return { w: f.w, h: f.h, px };
}

/** Shift a frame down by `rows`, clipping everything below `groundY` (the creature sinks into the floor). */
export function sinkInto(f: Frame, rows: number, groundY: number): Frame {
  const px = new Uint8Array(f.px.length);
  for (let y = 0; y < f.h; y++) {
    const ny = y + rows;
    if (ny >= groundY) continue;
    px.set(f.px.subarray(y * f.w, (y + 1) * f.w), ny * f.w);
  }
  return { w: f.w, h: f.h, px };
}

export function frameToRgba(f: Frame, palette: readonly string[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(f.w * f.h * 4);
  const rgb = palette.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  for (let i = 0; i < f.px.length; i++) {
    const c = f.px[i];
    if (!c) continue;
    out[i * 4] = rgb[c][0];
    out[i * 4 + 1] = rgb[c][1];
    out[i * 4 + 2] = rgb[c][2];
    out[i * 4 + 3] = 255;
  }
  return out;
}
