import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="font-display text-5xl text-[var(--accent)]">404</div>
      <p className="text-white/60">This room is not on the blueprint yet.</p>
      <Link href="/" className="text-sm text-white/80 underline">
        Back to the title screen
      </Link>
    </main>
  );
}
