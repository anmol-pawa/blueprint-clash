import Link from "next/link";
import { RACE_PUZZLES } from "@/content/race/puzzles";

export const metadata = { title: "Race Hunter: Blueprint Clash" };

export default function RaceIndex() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-3 p-3">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-[var(--accent)]">Race Hunter</h1>
        <Link href="/" className="px-btn flex min-h-11 items-center px-3 text-sm">Home</Link>
      </header>
      <p className="text-sm text-white/70">Schedule threads one step at a time to break a program, then let the explorer check every interleaving of the fix.</p>
      <ul className="flex flex-col gap-2">
        {RACE_PUZZLES.map((p) => (
          <li key={p.id}>
            <Link href={`/race/${p.id}`} className="px-btn flex min-h-12 flex-col items-start gap-1 p-3 text-left">
              <span className="text-sm text-[var(--accent-2)]">{p.title}</span>
              <span className="text-xs text-white/70">{p.goal}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
