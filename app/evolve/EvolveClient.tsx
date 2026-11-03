"use client";
import { useEffect, useRef, useState } from "react";
import { EvolutionStage } from "@/game/battle/EvolutionStage";
import { ARCHITECT } from "@/game/sprites/creatures/architect";
import { DRAFTLING } from "@/game/sprites/creatures/draftling";
import { evolutionText, type Beat } from "@/lib/battle/evolution";

export function EvolveClient() {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<EvolutionStage | null>(null);
  const [beat, setBeat] = useState<Beat>("announce");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let lastBeat: Beat = "announce";
    const s = new EvolutionStage(host.current!, DRAFTLING, ARCHITECT, (f) => {
      if (f.beat !== lastBeat) {
        lastBeat = f.beat;
        setBeat(f.beat);
      }
      if (f.done) setDone(true);
    });
    stage.current = s;
    void s.init().then(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) s.skip();
    });
    return () => {
      s.destroy();
      stage.current = null;
    };
  }, []);

  return (
    <main className="fixed inset-0 flex flex-col bg-[var(--bg)]">
      <div ref={host} className="relative min-h-0 flex-[0_0_52%] md:flex-1" aria-label="Evolution stage" />
      <section className="panel m-2 flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto p-4 text-center md:flex-none" aria-live="polite">
        <p className="font-display min-h-[2.5rem] text-lg text-[var(--accent-2)]" data-testid="evolve-text">
          {evolutionText(beat, DRAFTLING.name, ARCHITECT.name)}
        </p>
        {done ? (
          <>
            <p className="max-w-md text-sm text-white/80">An Architect plans before it builds: it keeps a blueprint scroll, wears a hard hat, and leaves a pencil mark wherever its tail drags.</p>
            <a href="../play/" className="px-btn px-btn-primary min-h-11 px-4 py-3">
              Back to town
            </a>
          </>
        ) : (
          <button className="px-btn min-h-11 px-4 py-2" onClick={() => stage.current?.skip()}>
            Skip
          </button>
        )}
      </section>
    </main>
  );
}
