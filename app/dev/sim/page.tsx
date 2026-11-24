"use client";
import { useEffect, useMemo, useState } from "react";
import { PixelChart, type ChartLine } from "@/components/sim/PixelChart";
import { isLatest, simulateInWorker } from "@/lib/sim/browser/client";
import { cloneScenario, PRESETS, type Scenario } from "@/lib/sim/presets";
import type { ScenarioRun } from "@/lib/sim/run";

const NODE_COLORS = ["#7dd3fc", "#fbbf24", "#a3e635", "#f472b6", "#c4b5fd", "#fb923c"];

interface NumFieldProps {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

function NumField({ label, value, step = 1, min = 0, max, onChange }: NumFieldProps) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs">
      <span className="opacity-75">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        className="min-h-11 w-full min-w-0 rounded border-2 border-[#060d20] bg-[#071027] px-2 font-mono text-sm text-sky-100"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = e.target.valueAsNumber;
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </label>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="panel px-3 py-2">
      <div className="text-xs opacity-70">{label}</div>
      <div className={`font-display text-lg ${warn ? "text-red-300" : "text-amber-200"}`}>{value}</div>
    </div>
  );
}

/** Simulator playground (ARCH §4): pick a preset, edit it, and watch the fluid tick model react. */
export default function SimPage() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [scenario, setScenario] = useState<Scenario>(() => cloneScenario(PRESETS[0]));
  const [result, setResult] = useState<{ run: ScenarioRun; ms: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const r = await simulateInWorker(scenario);
      if (!isLatest(r)) return;
      if (r.ok) {
        setResult({ run: r.run, ms: r.ms });
        setError(null);
      } else setError(r.error);
    }, 120);
    return () => clearTimeout(timer);
  }, [scenario]);

  const edit = (f: (s: Scenario) => void) =>
    setScenario((prev) => {
      const next = cloneScenario(prev);
      f(next);
      return next;
    });

  const pick = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setScenario(cloneScenario(p));
  };

  const charts = useMemo(() => {
    if (!result) return null;
    const s = result.run.series;
    const ids = Object.keys(s.nodes);
    const rho: ChartLine[] = ids.map((id, i) => ({ label: id, color: NODE_COLORS[i % NODE_COLORS.length], values: s.nodes[id].rho }));
    return { s, rho };
  }, [result]);

  const sum = result?.run.summary;
  const lesson = PRESETS.find((p) => p.id === presetId)?.lesson;

  return (
    <main className="blueprint-grid min-h-dvh">
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <header>
          <h1 className="font-display text-2xl text-sky-200">/dev/sim</h1>
          <p className="text-sm opacity-80">
            Fluid tick model playground: one tick is one simulated second, each component an M/M/c queue with backlog, timeouts and retries. Runs in a Web Worker. All numbers are illustrative model outputs, not measurements.
          </p>
        </header>

        <nav className="flex flex-wrap gap-2" aria-label="Presets">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={`px-btn px-3 text-sm ${p.id === presetId ? "px-btn-primary" : ""}`} aria-pressed={p.id === presetId} onClick={() => pick(p.id)}>
              {p.name}
            </button>
          ))}
        </nav>
        {lesson && <p className="panel p-3 text-sm" data-testid="lesson">{lesson}</p>}

        {error && (
          <p role="alert" className="panel p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {sum && (
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" data-testid="summary">
            <Stat label="Success" value={`${(sum.successRatio * 100).toFixed(1)} %`} warn={sum.successRatio < 0.99} />
            <Stat label="Unhealthy seconds" value={`${sum.unhealthyTicks}`} warn={sum.unhealthyTicks > 0} />
            <Stat label="Peak backlog" value={`${Math.round(sum.peakBacklog)}`} warn={sum.peakBacklog > 0} />
            <Stat label="Peak latency" value={`${sum.peakLatencyMs.toFixed(0)} ms`} />
            <Stat label={`Hottest: ${sum.hottest.id}`} value={`ρ ${sum.hottest.rho.toFixed(2)}`} warn={sum.hottest.rho >= 1} />
            <Stat label="Worker run" value={`${result.ms.toFixed(1)} ms`} />
          </section>
        )}

        {charts && (
          <section className="grid gap-3 md:grid-cols-2">
            <PixelChart
              testId="chart-throughput"
              title="Throughput"
              unit="req/s"
              lines={[
                { label: "offered", color: "#e6edff", values: charts.s.offered, dashed: true },
                { label: "goodput", color: "#a3e635", values: charts.s.goodput },
                { label: "errors", color: "#f87171", values: charts.s.errors },
              ]}
            />
            <PixelChart testId="chart-latency" title="Mean latency" unit="ms" lines={[{ label: "end to end", color: "#fbbf24", values: charts.s.latencyMs }]} />
            <PixelChart testId="chart-rho" title="Utilisation ρ" unit="arrivals / capacity" lines={charts.rho} reference={{ value: 1, label: "ρ = 1" }} />
            <PixelChart
              testId="chart-backlog"
              title="Backlog"
              unit="requests waiting"
              lines={Object.keys(charts.s.nodes).map((id, i) => ({ label: id, color: NODE_COLORS[i % NODE_COLORS.length], values: charts.s.nodes[id].backlog }))}
            />
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-display text-lg text-sky-200">Components</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {scenario.topology.components.map((c, i) => (
              <fieldset key={c.id} className="panel p-3">
                <legend className="font-display px-1 text-sm" style={{ color: NODE_COLORS[i % NODE_COLORS.length] }}>
                  {c.id}
                  {c.id === scenario.topology.entry ? " (entry)" : ""}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <NumField label="servers c" value={c.servers} min={1} max={500} onChange={(v) => edit((s) => (s.topology.components[i].servers = Math.max(1, Math.round(v))))} />
                  <NumField label="μ per server (req/s)" value={c.serviceRate} min={1} onChange={(v) => edit((s) => (s.topology.components[i].serviceRate = Math.max(1, v)))} />
                  <NumField label="queue limit" value={c.queueLimit} step={50} onChange={(v) => edit((s) => (s.topology.components[i].queueLimit = Math.max(0, v)))} />
                  <NumField label="timeout (s)" value={c.timeout} step={0.5} min={0.1} onChange={(v) => edit((s) => (s.topology.components[i].timeout = Math.max(0.1, v)))} />
                </div>
              </fieldset>
            ))}
          </div>

          {scenario.topology.edges.length > 0 && (
            <>
              <h2 className="font-display text-lg text-sky-200">Calls</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {scenario.topology.edges.map((e, i) => (
                  <fieldset key={`${e.from}-${e.to}`} className="panel p-3">
                    <legend className="font-display px-1 text-sm">
                      {e.from} → {e.to}
                    </legend>
                    <div className="grid grid-cols-3 gap-2">
                      <NumField label="weight" value={e.weight} step={0.05} max={1} onChange={(v) => edit((s) => (s.topology.edges[i].weight = Math.min(1, Math.max(0, v))))} />
                      <NumField label="retries" value={e.retries} max={10} onChange={(v) => edit((s) => (s.topology.edges[i].retries = Math.min(10, Math.max(0, Math.round(v)))))} />
                      <NumField label="latency (ms)" value={+(e.latency * 1000).toFixed(3)} step={0.5} onChange={(v) => edit((s) => (s.topology.edges[i].latency = Math.max(0, v) / 1000))} />
                    </div>
                  </fieldset>
                ))}
              </div>
            </>
          )}

          <h2 className="font-display text-lg text-sky-200">Traffic</h2>
          <fieldset className="panel p-3">
            <legend className="sr-only">Traffic steps</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {scenario.traffic.map((step, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 sm:col-span-2">
                  <NumField label={`from (s)`} value={step.from} onChange={(v) => edit((s) => (s.traffic[i].from = Math.max(0, Math.round(v))))} />
                  <NumField label="rate (req/s)" value={step.rate} step={10} onChange={(v) => edit((s) => (s.traffic[i].rate = Math.max(0, v)))} />
                </div>
              ))}
              <div className="col-span-2">
                <NumField label="run length (s)" value={scenario.seconds} step={10} min={10} max={3600} onChange={(v) => edit((s) => (s.seconds = Math.min(3600, Math.max(10, Math.round(v)))))} />
              </div>
            </div>
          </fieldset>
        </section>
      </div>
    </main>
  );
}
