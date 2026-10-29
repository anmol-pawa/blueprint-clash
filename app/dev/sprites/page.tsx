"use client";
import { SpriteCanvas } from "@/components/sprites/SpriteCanvas";
import { SPRITES } from "@/game/sprites";
import { PORTRAITS, WALKERS } from "@/game/sprites/characters";

/** Review page for art: every animation of every sprite, creatures at 3×, characters at 6×. */
export default function SpritesPage() {
  const groups = [
    { title: "Patternlings", defs: SPRITES, scale: 3 },
    { title: "Overworld walkers (24×32; left = mirrored right)", defs: WALKERS, scale: 6 },
    { title: "Dialogue portraits", defs: PORTRAITS, scale: 4 },
  ];
  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-xl font-bold">Sprites</h1>
      {groups.map((g) => (
        <div key={g.title}>
          <h2 className="mb-3 text-lg font-bold">{g.title}</h2>
          {g.defs.map((def) => (
            <section key={def.id} className="mb-8" data-testid={`sprite-${def.id}`}>
              <h3 className="mb-2 font-semibold">
                {def.name} <span className="text-sm opacity-60">{def.w}×{def.h}</span>
              </h3>
              <div className="flex flex-wrap gap-4">
                {Object.keys(def.anims).map((anim) => (
                  <figure key={anim} className="rounded-lg bg-[#8cc496] p-2 text-center text-xs text-black">
                    <SpriteCanvas def={def} anim={anim} scale={g.scale} />
                    <figcaption>
                      {anim} ({def.anims[anim].length})
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ))}
        </div>
      ))}
    </main>
  );
}
