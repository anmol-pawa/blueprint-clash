// A small pixel-styled line chart in SVG: stepped lines (one value per simulated second),
// crisp edges, a pixel font for labels. No chart library, so the first-load budget is untouched.

export interface ChartLine {
  label: string;
  color: string;
  values: readonly number[];
  /** Dashed lines are drawn on top, so a reference series stays visible where another overlaps it. */
  dashed?: boolean;
}

interface Props {
  title: string;
  unit: string;
  lines: readonly ChartLine[];
  /** Optional horizontal reference line (for example ρ = 1). */
  reference?: { value: number; label: string };
  testId?: string;
}

const W = 320;
const H = 132;
const PAD = { l: 36, r: 6, t: 6, b: 17 };

/** Rounds up to 1, 2 or 5 × 10^k so the axis reads cleanly. */
export function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

export function formatTick(v: number): string {
  if (v >= 1e6) return `${+(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${+(v / 1e3).toFixed(1)}k`;
  return `${+v.toFixed(v < 10 ? 2 : 0)}`;
}

export function PixelChart({ title, unit, lines, reference, testId }: Props) {
  const n = Math.max(1, ...lines.map((l) => l.values.length));
  const peak = Math.max(0, reference?.value ?? 0, ...lines.flatMap((l) => l.values));
  const yMax = niceMax(peak * 1.05);
  const x = (i: number) => PAD.l + (i / n) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (Math.min(v, yMax) / yMax) * (H - PAD.t - PAD.b);
  const stepPath = (values: readonly number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}H${x(i + 1).toFixed(1)}`).join("");
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * n));

  return (
    <figure className="panel p-2" data-testid={testId}>
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 px-1">
        <span className="font-display text-sm text-sky-200">
          {title} <span className="opacity-60">({unit})</span>
        </span>
        <span className="flex flex-wrap gap-x-3 text-xs">
          {lines.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1">
              <span aria-hidden className="inline-block h-2 w-3" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" shapeRendering="crispEdges" role="img" aria-label={`${title} over time`}>
        <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} fill="#071027" />
        {grid.map((g) => (
          <g key={g}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke="#1c3266" strokeWidth={1} />
            <text x={PAD.l - 3} y={y(g) + 3} textAnchor="end" fontSize={9} fill="#8fb3e8" fontFamily="var(--font-pixel)">
              {formatTick(g)}
            </text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <text key={t} x={x(t)} y={H - 4} textAnchor={i === xTicks.length - 1 ? "end" : "middle"} fontSize={9} fill="#8fb3e8" fontFamily="var(--font-pixel)">
            {t}s
          </text>
        ))}
        {reference && (
          <g>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(reference.value)} y2={y(reference.value)} stroke="#f87171" strokeWidth={1} strokeDasharray="4 3" />
            <text x={W - PAD.r - 2} y={y(reference.value) - 3} textAnchor="end" fontSize={9} fill="#fca5a5" fontFamily="var(--font-pixel)">
              {reference.label}
            </text>
          </g>
        )}
        {[...lines.filter((l) => !l.dashed), ...lines.filter((l) => l.dashed)].map((l) => (
          <path key={l.label} d={stepPath(l.values)} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="miter" strokeDasharray={l.dashed ? "5 3" : undefined} />
        ))}
      </svg>
    </figure>
  );
}
