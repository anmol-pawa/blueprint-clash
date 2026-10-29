"use client";
import { useEffect, useMemo, useState } from "react";
import { SpriteCanvas } from "@/components/SpriteCanvas";
import { DRAFTLING_PALETTE, type View } from "@/lib/sprites/draftling";
import { DRAFTLING_ANIMATIONS, drawFrame } from "@/lib/sprites/animations";

/** Review page for every sprite: all frames of every animation, plus a live player. */
export default function SpritesPage() {
  const [name, setName] = useState("idle");
  const [view, setView] = useState<View>("front");
  const [tick, setTick] = useState(0);
  const anim = DRAFTLING_ANIMATIONS[name];
  const pick = (n: string) => {
    setName(n);
    setTick(0);
  };

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (anim.loop ? (t + 1) % anim.poses.length : Math.min(t + 1, anim.poses.length - 1))), anim.frameMs * 2);
    return () => clearInterval(id);
  }, [anim]);

  const live = useMemo(() => drawFrame(anim, tick, view), [anim, tick, view]);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="font-display text-xl text-[var(--accent)]">Sprite review</h1>
      <p className="mt-1 text-sm text-slate-300">Draftling, the starter Patternling (64×64, front and back).</p>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Animation">
        {Object.keys(DRAFTLING_ANIMATIONS).map((n) => (
          <button key={n} className={`min-h-11 rounded border px-4 ${n === name ? "bg-sky-400 text-slate-900" : "border-sky-400/50"}`} onClick={() => pick(n)}>
            {n}
          </button>
        ))}
        {(["front", "back"] as const).map((v) => (
          <button key={v} className={`min-h-11 rounded border px-4 ${v === view ? "bg-amber-300 text-slate-900" : "border-amber-300/50"}`} onClick={() => setView(v)}>
            {v}
          </button>
        ))}
      </div>

      <section className="blueprint-grid mt-4 flex justify-center rounded border-2 border-slate-900 p-4" aria-label="Live preview">
        <SpriteCanvas buffer={live} palette={DRAFTLING_PALETTE} scale={6} label={`Draftling ${name} ${view}`} />
      </section>

      {Object.values(DRAFTLING_ANIMATIONS).map((a) => (
        <section key={a.name} className="mt-6">
          <h2 className="font-display text-sm text-amber-300">
            {a.name} · {a.poses.length} frames · {a.frameMs} ms{a.loop ? " · loops" : ""}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["front", "back"] as const).map((v) =>
              a.poses.map((_, i) => (
                <div key={`${v}${i}`} className="blueprint-grid rounded border border-slate-800 p-1">
                  <SpriteCanvas buffer={drawFrame(a, i, v)} palette={DRAFTLING_PALETTE} scale={2} label={`${a.name} ${v} frame ${i}`} />
                </div>
              )),
            )}
          </div>
        </section>
      ))}
    </main>
  );
}
