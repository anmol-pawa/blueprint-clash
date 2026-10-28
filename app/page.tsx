import { TRACKS } from "@/lib/tracks";

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="relative mx-auto flex max-w-5xl flex-col px-5 pb-16 pt-14 sm:pt-20">
        <section className="text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/50">C++ · System Design · Interview Arena</div>
          <h1 className="px-shadow mt-3 font-display text-[40px] leading-none tracking-[0.06em] min-[400px]:text-5xl sm:text-7xl md:text-8xl">
            <span className="text-white">BLUEPRINT</span>
            <br className="sm:hidden" />
            <span className="text-[var(--accent)]">CLASH</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
            A creature-tactics RPG where <span className="text-white">designs are your spells</span>. Compile real C++ against hidden tests and Change Storms, then wire architectures that survive real traffic and chaos.
          </p>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-2" aria-label="Learning tracks">
          {TRACKS.map((t) => (
            <article key={t.id} className="px-menu-item flex min-h-[160px] flex-col justify-end p-5 pl-7" style={{ "--item": t.color } as React.CSSProperties} data-testid={`track-${t.id}`}>
              <div className="absolute left-0 top-0 h-3 w-10 rounded-br-[3px] border-b-2 border-r-2 border-[#0e0f1a]" style={{ background: t.color }} />
              <div className="absolute right-5 top-4 font-display text-5xl" style={{ color: t.color, textShadow: "3px 3px 0 #0e0f1a" }} aria-hidden>
                {t.glyph}
              </div>
              <h2 className="pr-14 font-display text-xl tracking-wide">{t.title}</h2>
              <p className="mt-2 pr-10 text-sm leading-relaxed text-white/60">{t.blurb}</p>
              <span className="px-tag mt-3 w-fit text-xs" style={{ "--tone": t.color } as React.CSSProperties}>
                Under construction
              </span>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
