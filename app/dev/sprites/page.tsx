"use client";
import { SpriteCanvas } from "@/components/sprites/SpriteCanvas";
import { SPRITES } from "@/game/sprites";

/** Review page for creature art: every animation of every sprite, at 4× and 2×. */
export default function SpritesPage() {
  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-xl font-bold">Sprites</h1>
      {SPRITES.map((def) => (
        <section key={def.id} className="mb-8" data-testid={`sprite-${def.id}`}>
          <h2 className="mb-2 font-semibold">
            {def.name} <span className="text-sm opacity-60">{def.w}×{def.h}</span>
          </h2>
          <div className="flex flex-wrap gap-4">
            {Object.keys(def.anims).map((anim) => (
              <figure key={anim} className="rounded-lg bg-[#8cc496] p-2 text-center text-xs text-black">
                <SpriteCanvas def={def} anim={anim} scale={3} />
                <figcaption>
                  {anim} ({def.anims[anim].length})
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
