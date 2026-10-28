import { PILLARS, UPCOMING_MODES } from "@/lib/siteInfo";

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="blueprint-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 px-4 py-10 text-center">
        <header className="flex flex-col items-center gap-3">
          <div className="font-display text-sm tracking-[0.4em] text-[var(--accent-2)]">A DESIGN-TACTICS RPG</div>
          <h1 className="font-display text-5xl leading-none text-[var(--accent)] sm:text-7xl">
            Blueprint
            <br />
            Clash
          </h1>
          <p className="max-w-md text-balance text-white/70">
            Befriend Patternlings and Systemlings. Learn C++ low-level design and system design well enough to ace the interview.
          </p>
        </header>

        <section className="grid w-full gap-3 sm:grid-cols-2" aria-label="Game pillars">
          {PILLARS.map((p) => (
            <div key={p.id} className="panel p-4 text-left">
              <h2 className="font-display text-xl text-[var(--accent-2)]">{p.title}</h2>
              <p className="mt-1 text-sm text-white/70">{p.blurb}</p>
            </div>
          ))}
        </section>

        <section className="flex w-full flex-col gap-2" aria-label="Modes">
          <button className="px-btn px-btn-primary w-full text-lg" disabled>
            Start (coming soon)
          </button>
          <div className="grid grid-cols-2 gap-2">
            {UPCOMING_MODES.map((m) => (
              <button key={m} className="px-btn text-sm text-white/80" disabled>
                {m}
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
