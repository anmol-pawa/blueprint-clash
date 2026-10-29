"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SpriteCanvas } from "@/components/sprites/SpriteCanvas";
import { OverworldGame, type OverworldView } from "@/game/overworld/OverworldGame";
import { ADA_PORTRAIT, PLAYER_PORTRAIT } from "@/game/sprites/characters";
import { availableChoices, currentNode, visibleText } from "@/lib/dialogue/dialogue";
import type { Dir } from "@/lib/world/world";

const KEYS: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
const PORTRAITS = { ada: ADA_PORTRAIT, player: PLAYER_PORTRAIT } as const;

/** Typewriter text; the parent remounts it (via key) for each line. */
function Typewriter({ text }: { text: string }) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => setMs(performance.now() - start), 33);
    return () => clearInterval(id);
  }, []);
  return <span>{visibleText(text, ms)}</span>;
}

export function PlayClient() {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<OverworldGame | null>(null);
  const [view, setView] = useState<OverworldView>({ mapName: "", dialogue: null, speakerId: "" });

  useEffect(() => {
    const g = new OverworldGame(host.current!, setView);
    game.current = g;
    void g.init();
    return () => {
      g.destroy();
      game.current = null;
    };
  }, []);

  const press = useCallback(() => game.current?.interact(), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const dir = KEYS[e.key];
      if (dir) {
        e.preventDefault();
        game.current?.setHeld(dir);
      } else if (e.key === "Enter" || e.key === " " || e.key === "z" || e.key === "Z") {
        e.preventDefault();
        if (!e.repeat) press();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (KEYS[e.key]) game.current?.setHeld(null);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [press]);

  const d = view.dialogue;
  const node = d ? currentNode(d) : null;
  const choices = d ? availableChoices(d) : [];
  const portrait = node?.speaker && view.speakerId in PORTRAITS ? PORTRAITS[view.speakerId as keyof typeof PORTRAITS] : null;

  return (
    <main className="fixed inset-0 flex flex-col bg-[var(--bg)] select-none" style={{ touchAction: "none" }}>
      <div className="font-display flex items-center justify-between px-3 py-1 text-sm text-[var(--accent-2)]">
        <span>{view.mapName}</span>
        <a href="./" className="text-white/60 underline">
          Menu
        </a>
      </div>
      <div ref={host} className="relative min-h-0 flex-1" aria-label="Overworld" />

      {node && (
        <div className="panel bg-[#0e1c3e] absolute inset-x-2 bottom-44 z-10 flex gap-3 p-3 sm:bottom-6 sm:left-1/2 sm:max-w-2xl sm:-translate-x-1/2 sm:right-auto sm:w-full" role="dialog" aria-label="Dialogue" onClick={() => choices.length === 0 && press()}>
          {portrait && <SpriteCanvas def={portrait} anim="talk" scale={2} className="shrink-0 self-start rounded border-2 border-[#060d20]" />}
          <div className="min-w-0 flex-1">
            {node.speaker && <div className="font-display text-sm text-[var(--accent-2)]">{node.speaker}</div>}
            <p className="min-h-[3.5rem] text-base leading-snug">
              <Typewriter key={d!.nodeId} text={node.text} />
            </p>
            {choices.length > 0 ? (
              <div className="mt-2 flex flex-col gap-2">
                {choices.map((c, i) => (
                  <button key={c.text} className="px-btn px-3 py-2 text-left text-sm" onClick={(e) => { e.stopPropagation(); game.current?.choose(i); }}>
                    {c.text}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-1 text-right text-xs text-white/50">▼ Enter / tap</div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:hidden">
        <DPad onHold={(d2) => game.current?.setHeld(d2)} />
        <button className="px-btn px-btn-primary h-16 w-16 rounded-full text-xl" aria-label="Interact" onPointerDown={press}>
          A
        </button>
      </div>
      <p className="hidden pb-2 text-center text-xs text-white/50 sm:block">Arrows / WASD to walk · Enter or Space to talk</p>
    </main>
  );
}

function DPad({ onHold }: { onHold: (d: Dir | null) => void }) {
  const btn = (dir: Dir, label: string, cls: string) => (
    <button
      key={dir}
      aria-label={`Walk ${dir}`}
      className={`px-btn absolute h-12 w-12 text-lg ${cls}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(dir);
      }}
      onPointerUp={() => onHold(null)}
      onPointerCancel={() => onHold(null)}
    >
      {label}
    </button>
  );
  return (
    <div className="relative h-36 w-36">
      {btn("up", "▲", "left-12 top-0")}
      {btn("left", "◀", "left-0 top-12")}
      {btn("right", "▶", "left-24 top-12")}
      {btn("down", "▼", "left-12 top-24")}
    </div>
  );
}
