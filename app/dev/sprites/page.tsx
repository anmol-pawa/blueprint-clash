"use client";
import { useEffect, useRef } from "react";
import { SPRITES } from "@/game/sprites";
import type { SpriteDef } from "@/game/sprites/pixel";
import { frameCanvas } from "@/game/sprites/texture";

/** Plays one animation on a 2D canvas at an integer scale (nearest-neighbour). */
function AnimCanvas({ def, anim, scale }: { def: SpriteDef; anim: string; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const frames = def.anims[anim].map((f) => frameCanvas(def, f));
    const fps = def.fps?.[anim] ?? 4;
    const g = ref.current!.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    let i = 0;
    const draw = () => {
      g.clearRect(0, 0, def.w * scale, def.h * scale);
      g.drawImage(frames[i], 0, 0, def.w * scale, def.h * scale);
      i = (i + 1) % frames.length;
    };
    draw();
    const id = setInterval(draw, 1000 / fps);
    return () => clearInterval(id);
  }, [def, anim, scale]);
  return <canvas ref={ref} width={def.w * scale} height={def.h * scale} className="max-w-full rounded bg-[#10224a] [image-rendering:pixelated]" data-testid={`anim-${def.id}-${anim}`} />;
}

export default function SpritesPage() {
  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-1 text-xl font-bold">Sprite review</h1>
      <p className="mb-4 text-sm text-slate-300">Every sprite and animation, nearest-neighbour at 2×. Review art here before committing.</p>
      <div className="flex flex-col gap-6">
        {SPRITES.map((def) => (
          <section key={def.id} className="panel p-3" data-testid={`sprite-${def.id}`}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">
              {def.name} <span className="font-normal text-slate-400">{def.w}×{def.h}</span>
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.keys(def.anims).map((anim) => (
                <figure key={anim} className="m-0">
                  <AnimCanvas def={def} anim={anim} scale={2} />
                  <figcaption className="text-center text-xs text-slate-400">{anim}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
