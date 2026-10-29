"use client";
import { useMemo } from "react";
import { SpriteView } from "@/components/SpriteView";
import { DRAFTLING_PALETTE, draftlingFrames, type DraftlingAnim } from "@/lib/sprites/draftling";

const ANIMS: { anim: DraftlingAnim; fps: number }[] = [
  { anim: "idle", fps: 4 },
  { anim: "attack", fps: 5 },
  { anim: "hurt", fps: 4 },
  { anim: "faint", fps: 3 },
  { anim: "evolve", fps: 5 },
];

export default function SpritesPage() {
  const sheets = useMemo(
    () => ANIMS.map((a) => ({ ...a, front: draftlingFrames(a.anim, "front"), back: draftlingFrames(a.anim, "back") })),
    [],
  );
  return (
    <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Sprite review: Draftling</h1>
      <p style={{ opacity: 0.7, marginBottom: 12 }}>
        Animated at game speed (top), then every frame side by side. Front, then back.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, background: "#0e1a33", padding: 12 }}>
        {sheets.map((s) => (
          <figure key={s.anim}>
            <SpriteView frames={s.front} palette={DRAFTLING_PALETTE} scale={4} fps={s.fps} label={`${s.anim} front`} />
            <figcaption>{s.anim} (front)</figcaption>
          </figure>
        ))}
        {sheets.slice(0, 1).map((s) => (
          <figure key="back">
            <SpriteView frames={s.back} palette={DRAFTLING_PALETTE} scale={4} fps={s.fps} label="idle back" />
            <figcaption>idle (back)</figcaption>
          </figure>
        ))}
      </div>
      {sheets.map((s) => (
        <section key={s.anim} style={{ marginTop: 12 }}>
          <h2>{s.anim}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: "#0e1a33", padding: 8 }}>
            {s.front.map((f, i) => (
              <SpriteView key={`f${i}`} frames={[f]} palette={DRAFTLING_PALETTE} scale={2} />
            ))}
            {s.back.map((f, i) => (
              <SpriteView key={`b${i}`} frames={[f]} palette={DRAFTLING_PALETTE} scale={2} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
