"use client";
import { SpriteCanvas } from "@/components/sprites/SpriteCanvas";
import { SPRITES } from "@/game/sprites";
import { PORTRAITS, WALKERS } from "@/game/sprites/characters";
import { DRAFTING_HALL_SCENE, OLD_TOWN_SCENE, TILESETS } from "@/game/sprites/tiles";
import type { SpriteDef } from "@/game/sprites/pixel";

/** Review page for art: every animation of every sprite, creatures at 3×, characters at 6×. */
export default function SpritesPage() {
  const groups = [
    { title: "Patternlings", defs: SPRITES, scale: 3 },
    { title: "Overworld walkers (24×32; left = mirrored right)", defs: WALKERS, scale: 6 },
    { title: "Dialogue portraits", defs: PORTRAITS, scale: 4 },
  ];
  // each tile is shown as a one-tile sprite so the same canvas plays its animation
  const tileSprites = (set: (typeof TILESETS)[number]): SpriteDef[] =>
    Object.entries(set.tiles).map(([name, frames]) => ({ id: `${set.id}-${name}`, name, w: set.size, h: set.size, palette: set.palette, fps: { idle: set.fps?.[name] ?? 3 }, anims: { idle: frames.length > 1 ? frames : [frames[0], frames[0]] } }));
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
      <h2 className="mb-3 text-lg font-bold">Scenes (16×16 tiles at 3×)</h2>
      <div className="mb-8 flex flex-wrap gap-4">
        {[OLD_TOWN_SCENE, DRAFTING_HALL_SCENE].map((s) => (
          <figure key={s.id} className="rounded-lg bg-[#222] p-2 text-center text-xs text-white" data-testid={`scene-${s.id}`}>
            <SpriteCanvas def={s} scale={3} />
            <figcaption>{s.id} ({s.w / 16}×{s.h / 16} tiles)</figcaption>
          </figure>
        ))}
      </div>
      {TILESETS.map((set) => (
        <section key={set.id} className="mb-8" data-testid={`tileset-${set.id}`}>
          <h2 className="mb-3 text-lg font-bold">{set.name}</h2>
          <div className="flex flex-wrap gap-3">
            {tileSprites(set).map((t) => (
              <figure key={t.id} className="rounded bg-[#8cc496] p-1 text-center text-[10px] text-black">
                <SpriteCanvas def={t} scale={4} />
                <figcaption>{t.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
