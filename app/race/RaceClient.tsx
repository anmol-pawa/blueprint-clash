"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { enabledThreads, explore, isDone, PUZZLES, runSchedule, type Program } from "@/lib/concurrency";

export function RaceClient() {
  const [pid, setPid] = useState(PUZZLES[0].id);
  const puzzle = PUZZLES.find((p) => p.id === pid) ?? PUZZLES[0];
  const [fixId, setFixId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<number[]>([]);
  const fix = puzzle.fixes.find((f) => f.id === fixId) ?? null;
  const program: Program = useMemo(() => (fix ? fix.build() : puzzle.buggy()), [puzzle, fix]);
  const run = useMemo(() => runSchedule(program, schedule), [program, schedule]);
  const enabled = useMemo(() => (run.violation ? [] : enabledThreads(program, run.state)), [program, run]);
  const verdict = useMemo(() => (fix ? explore(program) : null), [program, fix]);
  const [counter, setCounter] = useState<ReturnType<typeof explore> | null>(null);

  const reset = (next?: { pid?: string; fixId?: string | null }) => {
    if (next?.pid) setPid(next.pid);
    if (next && "fixId" in next) setFixId(next.fixId ?? null);
    setSchedule([]);
    setCounter(null);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-3 p-3">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-[var(--accent)]">Race Hunter</h1>
        <Link href="/" className="px-btn flex min-h-11 items-center px-3 text-sm">Home</Link>
      </header>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Puzzles">
        {PUZZLES.map((p) => (
          <button key={p.id} role="tab" aria-selected={p.id === pid} onClick={() => reset({ pid: p.id, fixId: null })} className={`px-btn min-h-11 px-3 text-sm ${p.id === pid ? "text-[var(--accent-2)]" : ""}`}>{p.title}</button>
        ))}
      </div>
      <p className="text-sm text-white/80">{puzzle.brief}</p>

      <section className="grid gap-2 sm:grid-cols-2" aria-label="Threads">
        {program.threads.map((t, tid) => {
          const pc = run.state.threads[tid].pc;
          const done = isDone(program, run.state, tid);
          return (
            <div key={tid} className="panel flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-[var(--accent-2)]">{t.name}</span>
                <button disabled={!enabled.includes(tid)} onClick={() => setSchedule([...schedule, tid])} className="px-btn min-h-11 px-3 text-sm disabled:opacity-40">
                  {done ? "Done" : enabled.includes(tid) ? "Step" : "Blocked"}
                </button>
              </div>
              <pre className="overflow-x-auto text-xs leading-5">
                {t.code.map((ins, i) => (
                  <div key={i} className={i === pc && !done ? "bg-white/15" : ""}>
                    {i === pc && !done ? "▶ " : "  "}
                    {ins.cpp ?? <span className="text-white/40">{`// ${ins.op}`}</span>}
                  </div>
                ))}
              </pre>
            </div>
          );
        })}
      </section>

      <section className="panel p-3 text-sm" aria-label="State">
        <div className="text-xs text-white/60">Shared</div>
        <div className="font-mono">{Object.entries(run.state.shared).map(([k, v]) => `${k} = ${v}`).join(", ") || "(none)"}</div>
        <ol className="mt-2 list-decimal pl-5 text-xs text-white/70">{run.trace.map((e, i) => <li key={i}>{e.text}</li>)}</ol>
        {run.violation && <p className="mt-2 text-[var(--accent)]" role="alert">Broken: {run.violation.message}</p>}
        {!run.violation && enabled.length === 0 && schedule.length > 0 && <p className="mt-2 text-white/70">All threads finished and the invariant held. Try another order.</p>}
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="px-btn min-h-11 px-3 text-sm" onClick={() => setSchedule([])}>Restart</button>
        <button className="px-btn min-h-11 px-3 text-sm" onClick={() => { const r = explore(program); setCounter(r); const f = r.findings[0]; if (f) setSchedule(f.schedule); }}>Explore all interleavings</button>
      </div>
      {counter && (
        <p className="panel p-3 text-sm" role="status">
          {counter.findings.length ? `Shortest counterexample (${counter.findings[0].schedule.length} steps, ${counter.findings[0].violation.kind}) replayed above.` : counter.proved ? `Proved safe: all ${counter.statesExplored} states checked.` : "Search bound reached without a proof."}
        </p>
      )}

      <section className="flex flex-col gap-2" aria-label="Fixes">
        <h2 className="font-display text-lg text-[var(--accent-2)]">Pick a fix</h2>
        {puzzle.fixes.map((f) => (
          <button key={f.id} onClick={() => reset({ fixId: f.id })} aria-pressed={f.id === fixId} className={`px-btn min-h-12 p-3 text-left text-sm ${f.id === fixId ? "text-[var(--accent-2)]" : ""}`}>{f.label}</button>
        ))}
        {fix && verdict && (
          <div className="panel p-3 text-sm" role="status">
            <strong>{verdict.proved ? `Proved: every interleaving is safe (${verdict.statesExplored} states).` : verdict.findings.length ? `Still broken: ${verdict.findings[0].violation.message}` : "Inconclusive."}</strong>
            <p className="mt-1 text-white/70">{fix.why}</p>
          </div>
        )}
        {fix && <button className="px-btn min-h-11 px-3 text-sm" onClick={() => reset({ fixId: null })}>Back to the buggy version</button>}
      </section>
    </main>
  );
}
