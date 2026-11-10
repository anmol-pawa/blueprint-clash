"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addClass, addEdge, addField, addMethod, boardStorageKey, boardToSkeleton, classHeight, clampPos, CLASS_W, edgeAnchor, ensureLayout, fieldText, HEAD_H, methodText, nextId, removeClass, removeEdge, removeField,
  joinSkeleton, parseBoard, removeMethod, ROW_H, serializeBoard, scoreBoard, setKind, toggleResponsibility, updateClass, updateEdge, validateBoard,
  type Board, type ClassKind, type EdgeKind, type Layout,
} from "@/lib/board";
import type { Responsibility } from "@/lib/workshop/types";

const W = 900;
const H = 560;
const EDGE_KINDS: { id: EdgeKind; label: string; hint: string }[] = [
  { id: "inherits", label: "Inherits", hint: "is-a (solid line, hollow triangle)" },
  { id: "implements", label: "Implements", hint: "realises an interface (dashed, hollow triangle)" },
  { id: "composition", label: "Composition", hint: "owns, same lifetime (filled diamond)" },
  { id: "aggregation", label: "Aggregation", hint: "holds, separate lifetime (hollow diamond)" },
  { id: "association", label: "Association", hint: "knows about (plain line)" },
  { id: "dependency", label: "Dependency", hint: "uses briefly (dashed arrow)" },
];
const KINDS: { id: ClassKind; label: string }[] = [{ id: "class", label: "+ Class" }, { id: "abstract", label: "+ Abstract" }, { id: "interface", label: "+ Interface" }, { id: "enum", label: "+ Enum" }];
const STEREO: Partial<Record<ClassKind, string>> = { abstract: "«abstract»", interface: "«interface»", enum: "«enum»" };
const COLOR: Record<ClassKind, string> = { class: "#2f6f8f", abstract: "#7a5ab5", interface: "#3f9a6b", enum: "#a8794a" };

/** Rasterises the live SVG (inline-styled, so it serialises faithfully) to a PNG download at 2x. */
async function downloadPng(svg: SVGSVGElement, name: string): Promise<void> {
  const xml = new XMLSerializer().serializeToString(svg);
  const withNs = xml.includes("xmlns=") ? xml : xml.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const url = URL.createObjectURL(new Blob([withNs], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("render failed")); img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = W * 2;
    canvas.height = H * 2;
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (blob) saveBlob(blob, name);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function saveBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function DesignBoard({ rubric, initial, draftId, finishLabel, onFinish }: { rubric: Responsibility[]; initial?: Board; /** Saves the board to this device under this id and restores it on return. */ draftId?: string; /** Overrides the finish button text (default: lock the board and start coding). */ finishLabel?: string; onFinish: (board: Board) => void }) {
  // Mounted only after a click on the client, so reading localStorage in the initialiser cannot mismatch server HTML.
  const [saved] = useState<Board | null>(() => {
    if (!draftId || initial) return null;
    try {
      const b = parseBoard(localStorage.getItem(boardStorageKey(draftId)));
      return b && b.classes.length > 0 ? b : null;
    } catch {
      return null; // storage unavailable: start empty
    }
  });
  const [board, setBoard] = useState<Board>(initial ?? saved ?? { classes: [], edges: [] });
  const [note, setNote] = useState(saved ? "Restored your saved board." : "");
  const [layout, setLayout] = useState<Layout>({});
  const [sel, setSel] = useState<string | null>(null);
  const [linkKind, setLinkKind] = useState<EdgeKind | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!draftId) return;
    try {
      localStorage.setItem(boardStorageKey(draftId), serializeBoard(board));
    } catch {
      /* ignore */
    }
  }, [board, draftId]);

  const lay = useMemo(() => ensureLayout(board, layout, W), [board, layout]);
  const base = useMemo(() => rubric.filter((r) => r.phase === "base"), [rubric]);
  const score = useMemo(() => scoreBoard(board, rubric, "base"), [board, rubric]);
  const issues = useMemo(() => validateBoard(board), [board]);
  const errors = issues.filter((i) => i.severity === "error");
  const selected = board.classes.find((c) => c.id === sel) ?? null;
  const byId = new Map(board.classes.map((c) => [c.id, c]));

  const toSvg = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const onClassDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (linkKind) {
      if (!linkFrom) setLinkFrom(id);
      else {
        setBoard((b) => addEdge(b, linkFrom, id, linkKind, nextId("e")));
        setLinkFrom(null);
        setLinkKind(null);
      }
      return;
    }
    setSel(id);
    const p = toSvg(e);
    drag.current = { id, dx: p.x - lay[id].x, dy: p.y - lay[id].y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toSvg(e);
    setLayout((l) => ({ ...ensureLayout(board, l, W), [d.id]: clampPos({ x: p.x - d.dx, y: p.y - d.dy }, W, H) }));
  };
  const add = (kind: ClassKind) => {
    const id = nextId("c");
    setBoard((b) => addClass(b, kind, id));
    setSel(id);
  };

  const btn = "px-btn min-h-11 px-3 text-sm";
  const field = "min-h-11 min-w-0 rounded border border-slate-500 bg-black/30 px-2 text-sm";
  return (
    <section className="space-y-3" aria-label="Design Board">
      <div className="panel space-y-2 p-3">
        <h2 className="font-display text-xl text-[var(--accent-2)]">Design Board</h2>
        <p className="text-sm text-white/70">Sketch the classes, then tag who owns each responsibility. One responsibility, one owner. Drag boxes; to draw a relationship pick its kind, then tap the source and the target.</p>
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Add">
          {KINDS.map((k) => (
            <button key={k.id} className={btn} onClick={() => add(k.id)}>{k.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Relationships">
          {EDGE_KINDS.map((k) => (
            <button key={k.id} className={`${btn} ${linkKind === k.id ? "px-btn-primary" : ""}`} title={k.hint} aria-pressed={linkKind === k.id} onClick={() => { setLinkKind(linkKind === k.id ? null : k.id); setLinkFrom(null); }}>
              {k.label}
            </button>
          ))}
        </div>
        {linkKind && <p className="text-sm text-yellow-300" role="status">{linkFrom ? `Now tap the target class (${byId.get(linkFrom)?.name} → ?)` : `Tap the class the ${linkKind} arrow starts from.`} <span className="text-white/60">{EDGE_KINDS.find((k) => k.id === linkKind)?.hint}</span></p>}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="panel min-w-0 self-start overflow-x-auto p-1">
          <svg ref={svg} fontFamily="system-ui, Helvetica, Arial, sans-serif" viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[720px] touch-none select-none rounded bg-[#101a2a]" role="img" aria-label="UML class diagram" onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)} onPointerDown={() => { setSel(null); setLinkFrom(null); }} data-testid="board-canvas">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#1d2b44" strokeWidth="1" /></pattern>
              <marker id="tri" markerWidth="14" markerHeight="14" refX="13" refY="7" orient="auto-start-reverse"><path d="M1 1L13 7L1 13Z" fill="#101a2a" stroke="#cfe3ff" strokeWidth="1.5" /></marker>
              <marker id="dia-f" markerWidth="18" markerHeight="12" refX="17" refY="6" orient="auto-start-reverse"><path d="M1 6L9 1L17 6L9 11Z" fill="#cfe3ff" stroke="#cfe3ff" /></marker>
              <marker id="dia-h" markerWidth="18" markerHeight="12" refX="17" refY="6" orient="auto-start-reverse"><path d="M1 6L9 1L17 6L9 11Z" fill="#101a2a" stroke="#cfe3ff" strokeWidth="1.5" /></marker>
              <marker id="arr" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto-start-reverse"><path d="M1 1L11 6L1 11" fill="none" stroke="#cfe3ff" strokeWidth="1.5" /></marker>
            </defs>
            <rect width={W} height={H} fill="#101a2a" />
            <rect width={W} height={H} fill="url(#grid)" />
            {board.classes.length === 0 && <text x={W / 2} y={H / 2} textAnchor="middle" fill="#6b82a8" fontSize="18">Add a class to start your design</text>}
            {board.edges.map((e) => {
              const a = byId.get(e.from);
              const b = byId.get(e.to);
              if (!a || !b) return null;
              const ha = classHeight(a), hb = classHeight(b);
              const p1 = edgeAnchor(lay[a.id], ha, lay[b.id], hb);
              const p2 = edgeAnchor(lay[b.id], hb, lay[a.id], ha);
              const dashed = e.kind === "implements" || e.kind === "dependency";
              const marker = e.kind === "inherits" || e.kind === "implements" ? "url(#tri)" : e.kind === "dependency" || e.kind === "association" ? (e.kind === "dependency" ? "url(#arr)" : undefined) : undefined;
              const diamond = e.kind === "composition" ? "url(#dia-f)" : e.kind === "aggregation" ? "url(#dia-h)" : undefined;
              const lbl = (p: { x: number; y: number }, t?: string, off = 1) => t ? <text x={p.x + 6 * off} y={p.y - 6} fill="#ffd36b" fontSize="13">{t}</text> : null;
              return (
                <g key={e.id} data-testid={`edge-${e.kind}`}>
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#cfe3ff" strokeWidth="1.8" strokeDasharray={dashed ? "6 4" : undefined} markerEnd={marker} markerStart={diamond} />
                  {lbl(p1, e.fromMult)}
                  {lbl(p2, e.toMult, -3)}
                </g>
              );
            })}
            {board.classes.map((c) => {
              const p = lay[c.id];
              const h = classHeight(c);
              const f = Math.max(1, c.fields.length);
              const on = c.id === sel || c.id === linkFrom;
              return (
                <g key={c.id} transform={`translate(${p.x} ${p.y})`} onPointerDown={(e) => onClassDown(e, c.id)} style={{ cursor: linkKind ? "crosshair" : "grab" }} data-testid={`class-${c.name}`}>
                  <rect width={CLASS_W} height={h} fill="#16233a" stroke={on ? "#ffd36b" : COLOR[c.kind]} strokeWidth={on ? 3 : 2} rx="3" />
                  <rect width={CLASS_W} height={HEAD_H} fill={COLOR[c.kind]} rx="3" />
                  {STEREO[c.kind] && <text x={CLASS_W / 2} y="12" textAnchor="middle" fill="#fff" fontSize="10">{STEREO[c.kind]}</text>}
                  <text x={CLASS_W / 2} y={STEREO[c.kind] ? 27 : 22} textAnchor="middle" fill="#fff" fontSize="15" fontWeight="bold" fontStyle={c.kind === "abstract" || c.kind === "interface" ? "italic" : "normal"}>{c.name}</text>
                  {(c.fields.length ? c.fields : [null]).map((fl, i) => (
                    <text key={i} x="8" y={HEAD_H + 13 + i * ROW_H} fill={fl ? "#d6e4ff" : "#4d6288"} fontSize="11" fontFamily="monospace">{fl ? fieldText(fl).slice(0, 27) : "(no fields)"}</text>
                  ))}
                  <line x1="0" x2={CLASS_W} y1={HEAD_H + f * ROW_H + 4} y2={HEAD_H + f * ROW_H + 4} stroke={COLOR[c.kind]} />
                  {(c.methods.length ? c.methods : [null]).map((m, i) => (
                    <text key={i} x="8" y={HEAD_H + f * ROW_H + 4 + 13 + i * ROW_H} fill={m ? "#d6e4ff" : "#4d6288"} fontSize="11" fontFamily="monospace">{m ? methodText(m).slice(0, 27) : "(no methods)"}</text>
                  ))}
                  {c.responsibilities.length > 0 && <text x={CLASS_W - 6} y={h - 4} textAnchor="end" fill="#ffd36b" fontSize="10">★ {c.responsibilities.length}</text>}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-3">
          {selected ? (
            <ClassEditor key={selected.id} board={board} id={selected.id} rubric={base} setBoard={setBoard} onDelete={() => { setBoard(removeClass(board, selected.id)); setSel(null); }} field={field} btn={btn} />
          ) : (
            <div className="panel p-3 text-sm text-white/70">Select a class to rename it, add members and tag the responsibilities it owns.</div>
          )}
          {board.edges.length > 0 && (
            <div className="panel space-y-2 p-3 text-sm">
              <h3 className="font-display text-base text-[var(--accent-2)]">Relationships</h3>
              {board.edges.map((e) => (
                <div key={e.id} className="space-y-1 rounded border border-slate-600 p-2">
                  <p>{byId.get(e.from)?.name} <span className="text-[var(--accent)]">{e.kind}</span> {byId.get(e.to)?.name}</p>
                  <div className="flex flex-wrap items-center gap-1">
                    <input aria-label={`Multiplicity near ${byId.get(e.from)?.name}`} className={`${field} w-16`} placeholder="1" value={e.fromMult ?? ""} onChange={(ev) => setBoard(updateEdge(board, e.id, { fromMult: ev.target.value }))} />
                    <span>→</span>
                    <input aria-label={`Multiplicity near ${byId.get(e.to)?.name}`} className={`${field} w-16`} placeholder="*" value={e.toMult ?? ""} onChange={(ev) => setBoard(updateEdge(board, e.id, { toMult: ev.target.value }))} />
                    <button className={btn} aria-label="Delete relationship" onClick={() => setBoard(removeEdge(board, e.id))}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel space-y-2 p-3 text-sm" data-testid="board-score">
        <h3 className="font-display text-base text-[var(--accent-2)]">Responsibility check · {Math.round(score.score * 100)}%</h3>
        <ul className="space-y-1">
          {score.results.map((r) => (
            <li key={r.id} className="flex gap-2">
              <span aria-hidden>{r.verdict === "ok" ? "✅" : r.verdict === "missing" ? "⬜" : "⚠️"}</span>
              <span>{r.text}{r.tagged.length > 0 && <b> → {r.tagged.join(", ")}</b>}{r.hint && r.verdict !== "missing" && <span className="block text-white/60">{r.hint}</span>}</span>
            </li>
          ))}
        </ul>
        {[...score.flags.map((f) => f.message), ...issues.filter((i) => i.severity === "warning").map((i) => i.message)].map((m, i) => (
          <p key={i} className="text-yellow-300">⚠ {m}</p>
        ))}
        <p className="text-xs text-white/60">Later Change Storms add responsibilities (a tier limit, say). A design that isolates each reason to change will absorb them without edits.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className={btn} disabled={board.classes.length === 0} onClick={() => svg.current && void downloadPng(svg.current, "design-board.png").catch(() => setNote("PNG export failed in this browser."))} data-testid="export-png">Export PNG</button>
        <button className={btn} disabled={board.classes.length === 0 || errors.length > 0} title={errors.length ? "Fix the board problems first" : undefined} onClick={() => saveBlob(new Blob([joinSkeleton(boardToSkeleton(board))], { type: "text/plain" }), "skeleton.h.txt")} data-testid="export-skeleton">Download C++ skeleton</button>
        {note && <span className="text-xs text-white/60" role="status">{note}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="px-btn px-btn-primary min-h-11 px-4 text-sm" onClick={() => onFinish(board)} data-testid="finish-board">
          {finishLabel ?? (board.classes.length === 0 ? "Skip the board and start coding" : "Lock the board and start coding")}
        </button>
        {errors.length > 0 && <p className="text-sm text-red-300">{errors.length} problem{errors.length === 1 ? "" : "s"}: {errors[0].message}</p>}
      </div>
    </section>
  );
}

function ClassEditor({ board, id, rubric, setBoard, onDelete, field, btn }: { board: Board; id: string; rubric: Responsibility[]; setBoard: (b: Board) => void; onDelete: () => void; field: string; btn: string }) {
  const c = board.classes.find((x) => x.id === id)!;
  const [fname, setFname] = useState("");
  const [ftype, setFtype] = useState("int");
  const [mname, setMname] = useState("");
  const [mret, setMret] = useState("void");
  const [mparams, setMparams] = useState("");
  const [mconst, setMconst] = useState(false);
  return (
    <div className="panel space-y-3 p-3 text-sm" data-testid="class-editor">
      <div className="flex gap-2">
        <input aria-label="Class name" className={`${field} flex-1`} value={c.name} onChange={(e) => setBoard(updateClass(board, id, { name: e.target.value }))} />
        <select aria-label="Kind" className={field} value={c.kind} onChange={(e) => setBoard(setKind(board, id, e.target.value as ClassKind))}>
          <option value="class">class</option><option value="abstract">abstract</option><option value="interface">interface</option><option value="enum">enum</option>
        </select>
      </div>

      <fieldset className="space-y-1">
        <legend className="text-white/70">Responsibilities this class owns</legend>
        {rubric.map((r) => (
          <label key={r.id} className="flex min-h-11 items-start gap-2">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={c.responsibilities.includes(r.id)} onChange={() => setBoard(toggleResponsibility(board, id, r.id))} />
            <span>{r.text}</span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-1">
        <p className="text-white/70">Fields</p>
        {c.fields.map((f, i) => (
          <p key={i} className="flex items-center justify-between gap-2 font-mono text-xs"><span className="min-w-0 break-words">{fieldText(f)}</span><button className="px-btn min-h-9 px-2" aria-label={`Remove field ${f.name}`} onClick={() => setBoard(removeField(board, id, i))}>✕</button></p>
        ))}
        <div className="flex gap-1">
          <input aria-label="Field name" className={`${field} w-0 flex-1`} placeholder="name" value={fname} onChange={(e) => setFname(e.target.value)} />
          <input aria-label="Field type" className={`${field} w-0 flex-1`} placeholder="type" value={ftype} onChange={(e) => setFtype(e.target.value)} />
          <button className={btn} disabled={!fname.trim()} onClick={() => { setBoard(addField(board, id, { name: fname.trim(), type: ftype.trim() || "int" })); setFname(""); }}>Add</button>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-white/70">Methods</p>
        {c.methods.map((m, i) => (
          <p key={i} className="flex items-center justify-between gap-2 font-mono text-xs"><span className="min-w-0 break-words">{methodText(m)}</span><button className="px-btn min-h-9 px-2" aria-label={`Remove method ${m.name}`} onClick={() => setBoard(removeMethod(board, id, i))}>✕</button></p>
        ))}
        <div className="grid grid-cols-2 gap-1">
          <input aria-label="Method name" className={field} placeholder="name" value={mname} onChange={(e) => setMname(e.target.value)} />
          <input aria-label="Return type" className={field} placeholder="returns" value={mret} onChange={(e) => setMret(e.target.value)} />
          <input aria-label="Parameters" className={`${field} col-span-2`} placeholder="const Member& m, int n" value={mparams} onChange={(e) => setMparams(e.target.value)} />
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={mconst} onChange={(e) => setMconst(e.target.checked)} />const</label>
          <button className={btn} disabled={!mname.trim()} onClick={() => { setBoard(addMethod(board, id, { name: mname.trim(), returns: mret.trim(), params: mparams.trim(), isConst: mconst, isAbstract: c.kind === "interface" })); setMname(""); setMparams(""); }}>Add method</button>
        </div>
      </div>

      <button className={btn} onClick={onDelete}>Delete class</button>
    </div>
  );
}
