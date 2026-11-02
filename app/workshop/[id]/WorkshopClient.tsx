"use client";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Prose } from "@/components/Prose";
import { WorkspaceEditor } from "@/components/WorkspaceEditor";
import { judgeInBrowser } from "@/lib/judge/browser/client";
import type { BrowserJudgeResult } from "@/lib/judge/browser/protocol";
import type { ProjectFile } from "@/lib/judge/types";
import { expectedTestCount, hiddenFiles, providedFiles, STARTER, visibleRequirements, type WorkshopBundle } from "@/lib/workshop/bundle";
import { initialFlow, knownRequirements, reduceFlow, surprises, type FlowEvent } from "@/lib/workshop/flow";
import { clarifyScore, workshopScore } from "@/lib/workshop/score";
import type { PhaseId } from "@/lib/workshop/types";

const PHASE_NAME: Record<PhaseId, string> = { base: "Build it", storm1: "Change Storm 1", storm2: "Change Storm 2", storm3: "Change Storm 3" };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

export function WorkshopClient({ bundle }: { bundle: WorkshopBundle }) {
  const [flow, dispatch] = useReducer((s: ReturnType<typeof initialFlow>, e: FlowEvent) => reduceFlow(s, e, bundle.clarify), bundle.phases, initialFlow);
  const lastSubmitted = useRef<ProjectFile[]>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const known = useMemo(() => knownRequirements(bundle.requirements, bundle.clarify, flow.asked), [bundle, flow.asked]);
  const elapsed = flow.startedAtMs === null ? 0 : (flow.endedAtMs ?? Math.max(now, flow.startedAtMs)) - flow.startedAtMs;
  const btn = "px-btn min-h-11 px-4 text-sm";

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl space-y-3 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-display text-xs tracking-[0.3em] text-[var(--accent-2)]">THE WORKSHOP · {bundle.level}</p>
          <h1 className="font-display text-3xl text-[var(--accent)]">{bundle.title}</h1>
        </div>
        <p className="text-sm text-white/70" aria-label="Time used">
          ⏱ <span data-testid="clock">{mmss(elapsed)}</span> / par {bundle.parMinutes}:00
        </p>
      </header>
      <Stepper stage={flow.stage} phase={flow.phase} phases={bundle.phases} />

      {flow.stage === "brief" && (
        <section className="panel space-y-3 p-4" aria-label="Brief">
          <Prose md={bundle.brief} />
          <p className="text-xs text-white/60">The clock starts when you begin. Interviewers like candidates who ask before they build.</p>
          <button className={`${btn} px-btn-primary`} onClick={() => dispatch({ type: "START", nowMs: Date.now() })}>
            Start the interview
          </button>
        </section>
      )}

      {flow.stage === "clarify" && (
        <section className="panel space-y-3 p-4" aria-label="Clarify">
          <h2 className="font-display text-xl text-[var(--accent-2)]">Ask the interviewer</h2>
          <p className="text-sm text-white/70">Pick the questions you would really ask. Good questions reveal rules a later change would otherwise ambush you with; shotgunning irrelevant ones costs points.</p>
          <ul className="space-y-2">
            {bundle.clarify.map((q) => {
              const asked = flow.asked.includes(q.id);
              return (
                <li key={q.id}>
                  <button
                    className={`min-h-11 w-full rounded border px-3 py-2 text-left text-sm ${asked ? "border-emerald-500/60 bg-emerald-900/20" : "border-slate-500 hover:bg-white/5"}`}
                    aria-pressed={asked}
                    onClick={() => dispatch({ type: "ASK", questionId: q.id })}
                  >
                    <span className="block">❓ {q.text}</span>
                    {asked && <span className="mt-1 block text-emerald-300">💬 {q.answer}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <button className={`${btn} px-btn-primary`} onClick={() => dispatch({ type: "BEGIN_CODING" })}>
            Start coding ({flow.asked.length} asked)
          </button>
        </section>
      )}

      {flow.stage === "storm" && (
        <StormCard bundle={bundle} flow={flow} onAccept={() => dispatch({ type: "ACCEPT_STORM" })} />
      )}

      {flow.stage === "code" && (
        <section className="space-y-2" aria-label="Code">
          <div className="panel space-y-1 p-3 text-sm">
            <h2 className="font-display text-lg text-[var(--accent-2)]">{PHASE_NAME[flow.phase]}</h2>
            <ul className="list-disc space-y-0.5 pl-5">
              {visibleRequirements(bundle, flow.phase, known).map((r) => (
                <li key={r.id}>{r.text}</li>
              ))}
            </ul>
            <p className="text-xs text-white/60">
              Run and Submit both execute the hidden tests; they show the names and failure messages but never the test source. Submit counts for your score.
              {expectedTestCount(bundle, flow.phase) > 0 && <> {expectedTestCount(bundle, flow.phase)} tests this round.</>}
            </p>
          </div>
          <WorkspaceEditor
            key={flow.phase}
            id={`workshop-${bundle.id}`}
            provided={providedFiles(bundle, flow.phase)}
            starter={STARTER}
            runExtras={hiddenFiles(bundle, flow.phase)}
            submitExtras={hiddenFiles(bundle, flow.phase)}
            judge={(files) => judgeInBrowser(files, 10000)}
            onJudged={(mode, res: BrowserJudgeResult, files) => {
              if (mode !== "submit") return;
              lastSubmitted.current = files;
              const total = Math.max(res.summary.tests.length, expectedTestCount(bundle, flow.phase));
              dispatch({ type: "SUBMIT", result: { passed: res.summary.passed, total } });
            }}
          />
          <PhaseFooter bundle={bundle} flow={flow} onLock={() => dispatch({ type: "LOCK", files: lastSubmitted.current, nowMs: Date.now() })} />
        </section>
      )}

      {flow.stage === "debrief" && <Debrief bundle={bundle} flow={flow} />}
    </main>
  );
}

function Stepper({ stage, phase, phases }: { stage: string; phase: PhaseId; phases: PhaseId[] }) {
  const steps = [{ id: "brief", label: "Brief" }, { id: "clarify", label: "Clarify" }, ...phases.map((p) => ({ id: p, label: p === "base" ? "Build" : PHASE_NAME[p].replace("Change ", "") })), { id: "debrief", label: "Debrief" }];
  const current = stage === "brief" || stage === "clarify" || stage === "debrief" ? stage : phase;
  const at = steps.findIndex((s) => s.id === current);
  return (
    <ol className="flex flex-wrap gap-1 text-xs" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s.id} aria-current={i === at ? "step" : undefined} className={`rounded border px-2 py-1 ${i === at ? "border-[var(--accent)] text-[var(--accent)]" : i < at ? "border-emerald-600/60 text-emerald-300" : "border-slate-600 text-white/50"}`}>
          {i < at ? "✓ " : ""}{s.label}
        </li>
      ))}
    </ol>
  );
}

function PhaseFooter({ bundle, flow, onLock }: { bundle: WorkshopBundle; flow: ReturnType<typeof initialFlow>; onLock: () => void }) {
  const rec = flow.records[flow.phase];
  const last = flow.phases[flow.phases.length - 1] === flow.phase;
  const total = expectedTestCount(bundle, flow.phase);
  return (
    <div className="panel flex flex-wrap items-center justify-between gap-2 p-3 text-sm" data-testid="phase-footer">
      <p>
        {rec.attempts === 0 ? "Submit at least once to lock this round in." : <>Best so far: <b>{rec.best?.passed ?? 0}/{rec.best?.total ?? total}</b> after {rec.attempts} submit{rec.attempts === 1 ? "" : "s"}.</>}
      </p>
      <button className="px-btn px-btn-primary min-h-11 px-4" disabled={rec.attempts === 0} onClick={onLock} data-testid="lock">
        {last ? "Lock in and see the debrief" : "Lock in and face the next storm"}
      </button>
    </div>
  );
}

function StormCard({ bundle, flow, onAccept }: { bundle: WorkshopBundle; flow: ReturnType<typeof initialFlow>; onAccept: () => void }) {
  const reqs = bundle.requirements.filter((r) => r.phase === flow.phase);
  const ambush = surprises(bundle.requirements, bundle.clarify, flow.asked, flow.phase);
  return (
    <section className="panel space-y-3 border-red-500/60 p-4" aria-label="Change Storm">
      <h2 className="font-display text-2xl text-red-400">⛈ {PHASE_NAME[flow.phase]} incoming</h2>
      <p className="text-sm">The product owner walks over: the requirements just changed. Your existing code is locked in, and every earlier test still runs. Extend the design; do not rewrite it.</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">{reqs.map((r) => <li key={r.id}>{r.text}</li>)}</ul>
      {ambush.length > 0 ? (
        <p className="rounded border border-red-500/50 bg-red-900/20 p-2 text-sm" data-testid="ambush">
          😬 You never asked about this. A clarifying question in the first five minutes would have let you design for it.
        </p>
      ) : (
        <p className="rounded border border-emerald-500/50 bg-emerald-900/20 p-2 text-sm" data-testid="foresight">
          ✅ You saw this coming: your clarifying questions already surfaced it.
        </p>
      )}
      <button className="px-btn px-btn-primary min-h-11 px-4 text-sm" onClick={onAccept}>
        Accept the change
      </button>
    </section>
  );
}

function Debrief({ bundle, flow }: { bundle: WorkshopBundle; flow: ReturnType<typeof initialFlow> }) {
  const score = useMemo(() => workshopScore({ flow, parMinutes: bundle.parMinutes }), [flow, bundle.parMinutes]);
  const clar = useMemo(() => clarifyScore(bundle.clarify, flow.asked), [bundle.clarify, flow.asked]);
  const [showRef, setShowRef] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const rows: [string, string][] = [
    ["Behaviour tests (40%)", pct(score.parts.tests)],
    ["Change Storms (20%)", pct(score.parts.storms)],
    ["Time vs par (10%)", pct(score.parts.time)],
    ["Design board (15%)", "not played yet"],
    ["Senior Review (15%)", "not played yet"],
  ];
  return (
    <section className="space-y-3" aria-label="Debrief">
      <div className="panel space-y-2 p-4">
        <h2 className="font-display text-2xl text-[var(--accent)]">Debrief</h2>
        <p className="text-3xl" aria-label={`${score.stars} stars`} data-testid="stars">{"★".repeat(score.stars)}{"☆".repeat(3 - score.stars)}</p>
        <p className="text-sm">Score so far: <b data-testid="total">{pct(score.total)}</b> {score.partial && <span className="text-white/60">(board and review not played yet, so the weights were rescaled)</span>}</p>
        {score.starThreePending && <p className="text-sm text-yellow-300">Third star pending: your design is open enough, but Senior Review has not run yet.</p>}
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-white/70">{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </div>

      <div className="panel space-y-2 p-4 text-sm">
        <h3 className="font-display text-lg text-[var(--accent-2)]">Clarifying questions: {pct(clar.score)}</h3>
        <p>You asked {flow.asked.length}; {clar.essentialAsked} of {clar.essentialTotal} essential ones{clar.noiseAsked > 0 ? `, and ${clar.noiseAsked} that added nothing` : ""}.</p>
        {clar.missedEssential.length > 0 && (
          <ul className="list-disc pl-5">
            {clar.missedEssential.map((id) => {
              const q = bundle.clarify.find((c) => c.id === id)!;
              return <li key={id}>Missed: “{q.text}” → {q.answer}</li>;
            })}
          </ul>
        )}
      </div>

      <div className="panel space-y-2 p-4 text-sm">
        <h3 className="font-display text-lg text-[var(--accent-2)]">Change Storms and the Open/Closed score</h3>
        {score.stormOutcomes.length === 0 && <p>No storms in this problem.</p>}
        {score.stormOutcomes.map((o) => (
          <div key={o.phase} className="space-y-1">
            <p>
              <b>{PHASE_NAME[o.phase]}</b>: tests {o.tests ? `${o.tests.passed}/${o.tests.total}` : "not submitted"}; OCP {o.ocp ? <b>{pct(o.ocp.score)}</b> : "n/a"}
              {o.ocp && <> ({o.ocp.added} lines added, {o.ocp.touched} existing lines changed)</>}
            </p>
            {o.ocp && (
              <ul className="font-mono text-xs text-white/70">
                {o.ocp.perFile.filter((f) => f.status !== "same").map((f) => <li key={f.path}>{f.path}: +{f.added} / ~{f.touched} ({f.status})</li>)}
              </ul>
            )}
          </div>
        ))}
        <p className="text-xs text-white/60">OCP = lines added / (lines added + existing lines modified or deleted). A coarse proxy measured per file: extend with new files and new classes, and the score rises.</p>
      </div>

      <div className="panel space-y-2 p-4">
        <h3 className="font-display text-lg text-[var(--accent-2)]">Responsibilities a good design assigns</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {bundle.rubric.map((r) => <li key={r.id}>{r.text} <span className="text-white/60">(typically: {r.owners.join(" or ")})</span></li>)}
        </ul>
      </div>

      <div className="panel p-4"><Prose md={bundle.editorial} /></div>

      <div className="panel space-y-2 p-4">
        <h3 className="font-display text-lg text-[var(--accent-2)]">Follow-ups interviewers ask</h3>
        {bundle.followups.map((f, i) => (
          <div key={i} className="text-sm">
            <button className="min-h-11 w-full text-left underline-offset-2 hover:underline" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              <span className="mr-2 rounded border border-slate-500 px-1 text-xs">{f.level}</span>{f.question}
            </button>
            {open === i && <p className="ml-2 border-l-2 border-[var(--accent-2)] pl-3 text-white/80">{f.answer}</p>}
          </div>
        ))}
      </div>

      <div className="panel space-y-2 p-4">
        <button className="px-btn min-h-11 px-4 text-sm" aria-expanded={showRef} onClick={() => setShowRef(!showRef)}>
          {showRef ? "Hide" : "Show"} the reference design
        </button>
        {showRef && bundle.reference.map((f) => (
          <details key={f.path} className="text-sm" open>
            <summary className="min-h-8 cursor-pointer font-mono">{f.path}</summary>
            <pre className="overflow-x-auto rounded border border-slate-600 bg-black/30 p-2 font-mono text-xs">{f.content}</pre>
          </details>
        ))}
      </div>
    </section>
  );
}
