"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Prose } from "@/components/Prose";
import type { Lesson } from "@/lib/lessons/model";
import { indexedDbSaveStore, loadSave, updateSave, type SaveStore } from "@/lib/save/store";

function Code({ title, code, tone }: { title: string; code: string; tone: string }) {
  return (
    <section className="min-w-0">
      <h3 className={`font-display text-base ${tone}`}>{title}</h3>
      <pre tabIndex={0} className="mt-1 overflow-x-auto rounded border border-slate-600 bg-black/30 p-2 font-mono text-xs leading-snug">{code}</pre>
    </section>
  );
}

export function LessonClient({ lesson, nextId }: { lesson: Lesson; nextId: string | null }) {
  const store = useRef<SaveStore | null>(null);
  const [done, setDone] = useState(false);
  const [persist, setPersist] = useState(true);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        store.current = indexedDbSaveStore();
        const { data, warning } = await loadSave(store.current, Date.now());
        if (!live) return;
        setDone(data.lessonsDone.includes(lesson.id));
        if (warning) setPersist(false);
      } catch {
        if (live) setPersist(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [lesson.id]);

  const markDone = async () => {
    setDone(true);
    const s = store.current;
    if (!s || !persist) return;
    try {
      const { data } = await loadSave(s, Date.now());
      await updateSave(s, data, (d) => {
        if (!d.lessonsDone.includes(lesson.id)) d.lessonsDone.push(lesson.id);
      }, Date.now());
    } catch {
      setPersist(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 p-3">
      <header className="flex items-center justify-between gap-2">
        <Link href="/learn" className="px-btn flex min-h-11 items-center px-3 text-sm">All lessons</Link>
        <span className="text-xs text-white/60">{lesson.level}</span>
      </header>
      <div>
        <h1 className="font-display text-2xl text-[var(--accent)]">{lesson.title}</h1>
        <p className="mt-1 text-sm text-[var(--accent-2)]">“{lesson.oneLiner}”</p>
      </div>
      <Prose md={lesson.intro} />
      <section className="panel p-3">
        <h2 className="font-display text-lg text-[var(--accent-2)]">The smell</h2>
        <Prose md={lesson.smell} className="mt-1" />
      </section>
      <div className="grid gap-3 md:grid-cols-2">
        <Code title="Before" code={lesson.before} tone="text-red-300" />
        <Code title="After" code={lesson.after} tone="text-emerald-300" />
      </div>
      <section className="panel p-3">
        <h2 className="font-display text-lg text-[var(--accent-2)]">What changed, and the trade-off</h2>
        <Prose md={lesson.refactorNotes} className="mt-1" />
      </section>
      <section className="panel p-3">
        <h2 className="font-display text-lg text-[var(--accent-2)]">Say it in the interview</h2>
        <Prose md={lesson.interviewSignal} className="mt-1" />
      </section>
      <section className="panel p-3">
        <h2 className="font-display text-lg text-[var(--accent-2)]">When it goes too far</h2>
        <Prose md={lesson.overApplication} className="mt-1" />
      </section>
      <footer className="flex flex-col gap-2 pb-6 sm:flex-row">
        <button onClick={() => void markDone()} disabled={done} className="px-btn px-btn-primary min-h-12 flex-1 px-3">
          {done ? "Learned ✓" : "Mark as learned"}
        </button>
        <Link href="/battle?deck=solid-square" className="px-btn flex min-h-12 flex-1 items-center justify-center px-3 text-center">Drill with cards</Link>
        {nextId && <Link href={`/learn/${nextId}`} className="px-btn flex min-h-12 flex-1 items-center justify-center px-3">Next lesson</Link>}
      </footer>
      {!persist && <p className="text-xs text-white/50">Progress is not being saved in this browser.</p>}
    </main>
  );
}
