"use client";
import Link from "next/link";
import { useState } from "react";
import { Prose } from "@/components/Prose";
import { SOLID_LESSONS } from "@/content/lessons/solid-square";

function Code({ title, code }: { title: string; code: string }) {
  return (
    <div>
      <h3 className="font-display pt-2 text-base text-[var(--accent-2)]">{title}</h3>
      <pre className="overflow-x-auto rounded border border-slate-600 bg-black/30 p-2 font-mono text-xs">{code}</pre>
    </div>
  );
}

export function LearnClient() {
  const [id, setId] = useState(SOLID_LESSONS[0].id);
  const lesson = SOLID_LESSONS.find((l) => l.id === id) ?? SOLID_LESSONS[0];
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl">SOLID Square lessons</h1>
        <Link href="/" className="min-h-11 px-2 py-2 underline">Home</Link>
      </header>
      <nav aria-label="Lessons" className="flex flex-wrap gap-2">
        {SOLID_LESSONS.map((l) => (
          <button key={l.id} onClick={() => setId(l.id)} aria-pressed={l.id === id} className={`min-h-11 rounded border px-3 ${l.id === id ? "border-[var(--accent-2)] bg-white/10" : "border-slate-600"}`}>
            {l.id === "heuristics" ? "Heuristics" : l.id.toUpperCase()}
          </button>
        ))}
      </nav>
      <article className="space-y-3">
        <h2 className="font-display text-lg text-[var(--accent-2)]">{lesson.title}</h2>
        <p className="opacity-80">{lesson.summary}</p>
        <Prose md={`### The smell\n${lesson.smell}\n\n### The idea\n${lesson.idea}`} />
        <Code title="Before" code={lesson.before} />
        <Code title="After" code={lesson.after} />
        <Prose md={`### How to say it in an interview\n${lesson.interview}\n\n### The cost of over-applying it\n${lesson.overApply}`} />
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/battle?deck=solid-square" className="min-h-11 rounded border border-[var(--accent-2)] px-3 py-2">Practise with cards</Link>
          <Link href="/review?deck=solid-square" className="min-h-11 rounded border border-slate-600 px-3 py-2">Daily Review</Link>
        </div>
      </article>
    </main>
  );
}
