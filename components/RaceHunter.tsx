"use client";
import { useMemo, useState } from "react";
import { describeInstr, enabledThreads, explore, runSchedule, type ExploreResult } from "@/lib/concurrency";
import { RACE_PUZZLE_BY_ID } from "@/content/race/puzzles";

export function RaceHunter({ puzzleId }: { puzzleId: string }) {
  const puzzle = RACE_PUZZLE_BY_ID[puzzleId];
  const [variantId, setVariantId] = useState(puzzle.variants[0].id);
  const [schedule, setSchedule] = useState<number[]>([]);
  const [report, setReport] = useState<ExploreResult | null>(null);
  const variant = puzzle.variants.find((v) => v.id === variantId) ?? puzzle.variants[0];
  const program = useMemo(() => variant.build(), [variant]);
  const run = useMemo(() => runSchedule(program, schedule), [program, schedule]);
  const enabled = enabledThreads(program, run.state);
  const over = Boolean(run.violation) || enabled.length === 0;

  const pick = (id: string) => { setVariantId(id); setSchedule([]); setReport(null); };
  const finding = report?.findings[0];

  return (
    <div className="flex flex-col gap-3" data-testid="race-hunter">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Code version">
        {puzzle.variants.map((v) => (
          <button key={v.id} role="tab" aria-selected={v.id === variantId} onClick={() => pick(v.id)}
            className={`px-btn min-h-11 px-3 text-sm ${v.id === variantId ? "text-[var(--accent)]" : ""}`}>{v.label}</button>
        ))}
      </div>
      <p className="text-xs text-white/70">{variant.note}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {program.threads.map((t, tid) => {
          const ts = run.state.threads[tid];
          const status = ts.status === "waiting" ? "waiting on condition" : ts.status === "relock" ? "re-acquiring lock" : ts.pc >= t.code.length ? "finished" : "ready";
          return (
            <section key={tid} className="panel flex flex-col gap-2 p-3" aria-label={`Thread ${t.name}`}>
              <h3 className="font-display text-sm text-[var(--accent-2)]">{t.name} <span className="text-xs text-white/60">({status})</span></h3>
              <ol className="font-mono text-xs leading-6">
                {t.code.map((ins, i) => (
                  <li key={i} className={i === ts.pc ? "bg-white/15 text-[var(--accent)]" : "text-white/80"}>
                    <span className="mr-1 inline-block w-3">{i === ts.pc ? "▶" : ""}</span>{describeInstr(ins)}
                  </li>
                ))}
              </ol>
              <button className="px-btn min-h-11 px-3 text-sm disabled:opacity-40" disabled={over || !enabled.includes(tid)}
                onClick={() => setSchedule([...schedule, tid])}>Step {t.name}</button>
            </section>
          );
        })}
      </div>

      <section className="panel space-y-1 p-3 text-xs" aria-label="State">
        <div className="font-mono">shared: {JSON.stringify(run.state.shared)} · locks held: {JSON.stringify(run.state.owner)}</div>
        <ol className="max-h-32 overflow-auto font-mono text-white/70">
          {run.trace.map((e, i) => <li key={i}>{i + 1}. {e.text}</li>)}
        </ol>
        {run.violation && <p className="text-[var(--danger,#ff6b6b)]" role="alert" data-testid="violation">Bug found ({run.violation.kind}): {run.violation.message}</p>}
        {!run.violation && enabled.length === 0 && <p className="text-white/80">All threads finished with no violation on this schedule.</p>}
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="px-btn min-h-11 px-3 text-sm" onClick={() => setSchedule(schedule.slice(0, -1))} disabled={!schedule.length}>Undo</button>
        <button className="px-btn min-h-11 px-3 text-sm" onClick={() => { setSchedule([]); setReport(null); }}>Reset</button>
        <button className="px-btn min-h-11 px-3 text-sm text-[var(--accent)]" onClick={() => {
          const r = explore(program); setReport(r); if (r.findings[0]) setSchedule(r.findings[0].schedule);
        }}>Explore all interleavings</button>
      </div>

      {report && (
        <p className="panel p-3 text-sm" data-testid="explore-report">
          {finding
            ? `Found a ${finding.violation.kind} in ${finding.schedule.length} steps (shortest schedule, replayed above). Searched ${report.statesExplored} states.`
            : report.proved
              ? `Proved: none of the ${report.statesExplored} reachable states violates a check (every interleaving, bounded to this program).`
              : `No bug found in ${report.statesExplored} states, but the search hit its limit, so this is not a proof.`}
        </p>
      )}
    </div>
  );
}
