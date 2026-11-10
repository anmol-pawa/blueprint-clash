"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DesignBoard } from "@/components/DesignBoard";
import { scoreBoard, type Board } from "@/lib/board";
import type { BoardDrill } from "@/content/drills/types";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function DrillClient({ drill }: { drill: BoardDrill }) {
  const [board, setBoard] = useState<Board | null>(null);
  const result = useMemo(() => (board ? scoreBoard(board, drill.rubric, "base") : null), [board, drill.rubric]);
  const ownersOf = (id: string) => drill.reference.classes.filter((c) => c.responsibilities.includes(id)).map((c) => c.name).join(", ");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-3 p-3">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl text-[var(--accent)]">{drill.title}</h1>
        <Link href="/board" className="px-btn flex min-h-11 items-center px-3 text-sm">All drills</Link>
      </header>
      <section className="panel space-y-2 p-4 text-sm">
        <p>{drill.brief}</p>
        <p className="text-white/70">Tag each responsibility below on exactly one class.</p>
      </section>
      {!result && (
        <DesignBoard rubric={drill.rubric} draftId={`drill-${drill.id}`} finishLabel="Score my board" onFinish={(b) => setBoard(b)} />
      )}
      {result && (
        <section className="space-y-3" data-testid="drill-result">
          <div className="panel space-y-2 p-4 text-sm">
            <h2 className="font-display text-lg text-[var(--accent-2)]">Your board: {pct(result.score)}</h2>
            <ul className="space-y-1">
              {result.results.map((r) => (
                <li key={r.id}>
                  {r.verdict === "ok" ? "✅" : "⚠️"} {r.text}{" "}
                  <span className="text-white/60">→ {r.tagged.length ? r.tagged.join(", ") : "nobody"}{r.verdict !== "ok" ? `. ${r.hint}` : ""}</span>
                </li>
              ))}
            </ul>
            {result.flags.map((f, i) => <p key={i} className="text-yellow-300">⚠ {f.message}</p>)}
          </div>
          <div className="panel space-y-2 p-4 text-sm" data-testid="drill-reference">
            <h2 className="font-display text-lg text-[var(--accent-2)]">Reference design</h2>
            <ul className="space-y-1">
              {drill.reference.classes.map((c) => (
                <li key={c.id}>
                  <span className="font-mono">{c.kind === "class" ? "" : `«${c.kind}» `}{c.name}</span>
                  {c.responsibilities.length > 0 && <span className="text-white/70">: {drill.rubric.filter((r) => c.responsibilities.includes(r.id)).map((r) => r.text).join("; ")}</span>}
                </li>
              ))}
            </ul>
            <p className="text-white/70">Relationships: {drill.reference.edges.map((e) => `${drill.reference.classes.find((c) => c.id === e.from)?.name} ${e.kind} ${drill.reference.classes.find((c) => c.id === e.to)?.name}`).join("; ")}.</p>
            <p className="text-white/60">Rubric owners: {drill.rubric.map((r) => `${r.id} → ${ownersOf(r.id)}`).join("; ")}.</p>
          </div>
          <div className="panel space-y-2 p-4 text-sm">
            <h2 className="font-display text-lg text-[var(--accent-2)]">Trade-offs</h2>
            <ul className="list-disc space-y-1 pl-5">{drill.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}</ul>
            <h2 className="pt-2 font-display text-lg text-[var(--accent-2)]">Level signal</h2>
            <p>{drill.levelSignal}</p>
          </div>
          <button className="px-btn min-h-11 px-4 text-sm" onClick={() => setBoard(null)}>Back to my board</button>
        </section>
      )}
    </main>
  );
}
