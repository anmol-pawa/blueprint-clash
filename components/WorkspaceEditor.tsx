"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CodeEditor } from "./CodeEditor";
import {
  applyDraft, closeTab, createFile, createWorkspace, deleteFile, editFile, getFile, openFile, renameFile, userFiles,
  type Workspace, type WorkspaceResult,
} from "@/lib/editor/workspace";
import { debouncedSaver, indexedDbDraftStore, type DraftStore } from "@/lib/editor/drafts";
import type { ProjectFile } from "@/lib/judge/types";
import type { BrowserJudgeResult } from "@/lib/judge/browser/protocol";

export type JudgeFn = (files: ProjectFile[]) => Promise<BrowserJudgeResult>;

interface Props {
  /** Draft key, e.g. the problem id. */
  id: string;
  /** Read-only files shown in the tree (api.h). */
  provided: ProjectFile[];
  /** Starting user files when no draft exists. */
  starter: ProjectFile[];
  /** Hidden files added when judging: visible tests for Run, the full hidden set for Submit. */
  runExtras: ProjectFile[];
  submitExtras: ProjectFile[];
  judge: JudgeFn;
  store?: DraftStore;
}

type Mode = "run" | "submit";
type Action = { kind: "new" } | { kind: "rename"; path: string } | null;

const VERDICT_TEXT: Record<BrowserJudgeResult["verdict"], string> = {
  accepted: "Accepted",
  wrong_behaviour: "Wrong behaviour",
  compile_error: "Compile error",
  runtime_error: "Crashed",
  time_limit: "Time limit",
};

export function WorkspaceEditor({ id, provided, starter, runExtras, submitExtras, judge, store }: Props) {
  const draftStore = useMemo(() => store ?? indexedDbDraftStore(), [store]);
  const [ws, setWs] = useState<Workspace>(() => createWorkspace(provided, starter));
  const [loaded, setLoaded] = useState(false);
  const [action, setAction] = useState<Action>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<Mode | null>(null);
  const [result, setResult] = useState<{ mode: Mode; res: BrowserJudgeResult } | null>(null);
  const [fatal, setFatal] = useState("");
  const saver = useRef<ReturnType<typeof debouncedSaver> | null>(null);

  useEffect(() => {
    let live = true;
    saver.current = debouncedSaver(draftStore, id);
    draftStore.load(id).then((draft) => {
      if (!live) return;
      if (draft && draft.length) setWs(applyDraft(createWorkspace(provided, starter), draft));
      setLoaded(true);
    });
    return () => {
      live = false;
      void saver.current?.flush();
    };
    // provided/starter are static per problem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, draftStore]);

  const update = useCallback((next: Workspace) => {
    setWs(next);
    saver.current?.schedule(userFiles(next));
  }, []);

  const apply = (r: WorkspaceResult) => {
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    setError("");
    update(r.ws);
    return true;
  };

  const submitName = () => {
    if (!action) return;
    const ok = action.kind === "new" ? apply(createFile(ws, name.trim())) : apply(renameFile(ws, action.path, name.trim()));
    if (ok) {
      setAction(null);
      setName("");
    }
  };

  async function go(mode: Mode) {
    setBusy(mode);
    setFatal("");
    try {
      await saver.current?.flush();
      const files = [...ws.files.map((f) => ({ ...f })), ...(mode === "run" ? runExtras : submitExtras)];
      setResult({ mode, res: await judge(files) });
    } catch (e) {
      setFatal(String(e));
    } finally {
      setBusy(null);
    }
  }

  const active = ws.active ? getFile(ws, ws.active) : undefined;
  const diags = useMemo(() => (result?.res.diagnostics ?? []).filter((d) => d.file === ws.active), [result, ws.active]);
  const fileDiagCount = (p: string) => (result?.res.diagnostics ?? []).filter((d) => d.file === p && d.severity === "error").length;
  const btn = "min-h-11 rounded border border-slate-500 px-3 text-sm";

  return (
    <div className="flex flex-col gap-2" data-testid="workspace">
      <div className="flex flex-wrap items-center gap-2">
        <button id="run" className={`${btn} bg-blue-700 text-white disabled:opacity-50`} disabled={!!busy} onClick={() => go("run")}>
          {busy === "run" ? "Running…" : "Run"}
        </button>
        <button id="submit" className={`${btn} bg-emerald-700 text-white disabled:opacity-50`} disabled={!!busy} onClick={() => go("submit")}>
          {busy === "submit" ? "Judging…" : "Submit"}
        </button>
        <span className="text-xs opacity-70">{loaded ? "Draft saved on this device" : "Loading draft…"}</span>
      </div>

      <div className="grid min-h-[22rem] grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Files" className="min-w-0 rounded border border-slate-600 p-2 text-sm">
          <div className="mb-1 flex items-center justify-between">
            <b>Files</b>
            <button className={`${btn} px-2`} aria-label="New file" onClick={() => { setAction({ kind: "new" }); setName(""); setError(""); }}>+</button>
          </div>
          <ul>
            {ws.files.map((f) => (
              <li key={f.path} className="flex items-center gap-1">
                <button
                  className={`min-h-11 flex-1 truncate text-left ${ws.active === f.path ? "font-bold underline" : ""}`}
                  onClick={() => update(openFile(ws, f.path))}
                >
                  {f.readOnly ? "🔒 " : ""}{f.path}
                  {fileDiagCount(f.path) > 0 && <span className="ml-1 text-red-500">●</span>}
                </button>
                {!f.readOnly && (
                  <>
                    <button className="min-h-11 min-w-11" aria-label={`Rename ${f.path}`} onClick={() => { setAction({ kind: "rename", path: f.path }); setName(f.path); setError(""); }}>✎</button>
                    <button className="min-h-11 min-w-11" aria-label={`Delete ${f.path}`} onClick={() => { if (window.confirm(`Delete ${f.path}?`)) apply(deleteFile(ws, f.path)); }}>🗑</button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {action && (
            <form className="mt-2 flex gap-1" onSubmit={(e) => { e.preventDefault(); submitName(); }}>
              <input aria-label="File name" autoFocus className="min-h-11 min-w-0 flex-1 rounded border bg-transparent px-2" value={name} placeholder="loan_policy.h" onChange={(e) => setName(e.target.value)} />
              <button className={btn} type="submit">{action.kind === "new" ? "Add" : "Rename"}</button>
              <button className={btn} type="button" aria-label="Cancel" onClick={() => { setAction(null); setError(""); }}>×</button>
            </form>
          )}
          {error && <p role="alert" className="mt-1 text-xs text-red-500">{error}</p>}
        </nav>

        <div className="flex min-h-0 min-w-0 flex-col rounded border border-slate-600">
          <div role="tablist" className="flex overflow-x-auto border-b border-slate-600">
            {ws.open.map((p) => (
              <div key={p} className={`flex shrink-0 items-center ${ws.active === p ? "bg-slate-700/40" : ""}`}>
                <button role="tab" aria-selected={ws.active === p} className="min-h-11 px-3 text-sm" onClick={() => update(openFile(ws, p))}>{p}</button>
                <button aria-label={`Close ${p}`} className="min-h-11 min-w-8 text-sm" onClick={() => update(closeTab(ws, p))}>×</button>
              </div>
            ))}
          </div>
          <div className="h-80 min-h-0 flex-1">
            {active ? (
              <CodeEditor
                path={active.path}
                value={active.content}
                readOnly={active.readOnly}
                diagnostics={diags}
                onChange={(v) => update(editFile(ws, active.path, v))}
              />
            ) : (
              <p className="p-4 text-sm opacity-70">Open a file from the list.</p>
            )}
          </div>
          {active?.readOnly && <p className="border-t border-slate-600 px-2 py-1 text-xs opacity-70">Provided by the problem. Read-only.</p>}
        </div>
      </div>

      {fatal && <p id="fatal" className="text-sm text-red-500">{fatal}</p>}
      {result && <Results mode={result.mode} res={result.res} onJump={(p) => update(openFile(ws, p))} />}
    </div>
  );
}

function Results({ mode, res, onJump }: { mode: Mode; res: BrowserJudgeResult; onJump: (path: string) => void }) {
  const total = res.summary.tests.length;
  return (
    <section id="result" aria-live="polite" className="min-w-0 rounded border border-slate-600 p-2 text-sm">
      <p>
        {mode === "submit" ? "Submit" : "Run"}: <b id="verdict" data-verdict={res.verdict}>{VERDICT_TEXT[res.verdict]}</b>
        {total > 0 && <> · {res.summary.passed}/{total} tests</>} · compile {res.timings.compileMs} ms · run {res.timings.runMs} ms
      </p>
      {res.diagnostics.length > 0 && (
        <ul className="mt-1 break-words font-mono text-xs">
          {res.diagnostics.map((d, i) => (
            <li key={i}>
              <button className="min-h-8 text-left underline" onClick={() => onJump(d.file)}>{`${d.file}:${d.line}:${d.col}`}</button>{` ${d.severity}: ${d.message}`}
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-1 space-y-1">
        {res.summary.tests.map((t) => (
          <li key={`${t.suite}.${t.name}`} data-status={t.status} className="break-words">
            <span aria-hidden>{t.status === "pass" ? "✅" : t.status === "crash" ? "💥" : "❌"}</span> <code>{t.suite}.{t.name}</code> <span className="opacity-60">{t.ms} ms</span>
            {t.failures.map((f, i) => (
              <div key={i} className="ml-6 font-mono text-xs text-red-400">{f.file}:{f.line} {f.msg}</div>
            ))}
          </li>
        ))}
      </ul>
      {res.summary.crashed && <p className="mt-1 text-xs text-red-400">Crashed while running {res.summary.crashed}.</p>}
    </section>
  );
}
