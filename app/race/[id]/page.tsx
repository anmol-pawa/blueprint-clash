import Link from "next/link";
import { notFound } from "next/navigation";
import { RaceHunter } from "@/components/RaceHunter";
import { RACE_PUZZLES, RACE_PUZZLE_BY_ID } from "@/content/race/puzzles";

export const dynamicParams = false;

export function generateStaticParams() {
  return RACE_PUZZLES.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${RACE_PUZZLE_BY_ID[id]?.title ?? "Puzzle"}: Race Hunter: Blueprint Clash` };
}

export default async function RacePuzzlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const puzzle = RACE_PUZZLE_BY_ID[id];
  if (!puzzle) notFound();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-3 p-3">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl text-[var(--accent)]">{puzzle.title}</h1>
        <Link href="/race" className="px-btn flex min-h-11 items-center px-3 text-sm">All puzzles</Link>
      </header>
      <section className="panel space-y-1 p-4 text-sm">
        <p>{puzzle.brief}</p>
        <p className="text-[var(--accent-2)]">{puzzle.goal}</p>
      </section>
      <RaceHunter puzzleId={puzzle.id} />
    </main>
  );
}
