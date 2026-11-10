import Link from "next/link";
import { BOARD_DRILLS } from "@/content/drills";

export const metadata = { title: "Design Board drills: Blueprint Clash" };

export default function BoardIndex() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-3 p-3">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-[var(--accent)]">Design Board</h1>
        <Link href="/" className="px-btn flex min-h-11 items-center px-3 text-sm">Home</Link>
      </header>
      <p className="text-sm text-white/70">Short modelling drills: read a brief, draw the classes and relationships, tag who owns each responsibility, then compare with a reference and its trade-offs.</p>
      <ul className="flex flex-col gap-2">
        {BOARD_DRILLS.map((d) => (
          <li key={d.id}>
            <Link href={`/board/${d.id}`} className="px-btn flex min-h-12 flex-col items-start gap-1 p-3 text-left">
              <span className="text-sm text-[var(--accent-2)]">{d.title}</span>
              <span className="text-xs text-white/70">{d.rubric.length} responsibilities</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
