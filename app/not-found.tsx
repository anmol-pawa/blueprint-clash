import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <div className="font-display text-6xl font-black text-[var(--accent)] neon-text">404</div>
      <p className="text-white/60">This sheet isn&apos;t on the drafting table.</p>
      <Link href="/" className="text-sm text-white/80 underline">
        Back to the main menu
      </Link>
    </main>
  );
}
