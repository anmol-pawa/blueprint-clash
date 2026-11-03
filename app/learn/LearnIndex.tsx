"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { indexedDbSaveStore, loadSave } from "@/lib/save/store";

interface Row {
  id: string;
  level: string;
  title: string;
  oneLiner: string;
}

export function LearnIndex({ lessons }: { lessons: Row[] }) {
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const { data } = await loadSave(indexedDbSaveStore(), Date.now());
        if (live) setDone(data.lessonsDone);
      } catch {
        /* progress marks are optional */
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-3 p-3">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-[var(--accent)]">Lessons</h1>
        <Link href="/" className="px-btn flex min-h-11 items-center px-3 text-sm">Home</Link>
      </header>
      <p className="text-sm text-white/70">Each lesson: the smell, a C++ before and after, how to say it in an interview, and what over-applying it costs. Then drill it with cards.</p>
      <ul className="flex flex-col gap-2">
        {lessons.map((l) => (
          <li key={l.id}>
            <Link href={`/learn/${l.id}`} className="px-btn flex min-h-12 flex-col items-start gap-1 p-3 text-left">
              <span className="text-sm text-[var(--accent-2)]">
                {l.level} · {l.title} {done.includes(l.id) ? "✓" : ""}
              </span>
              <span className="text-xs text-white/70">{l.oneLiner}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
