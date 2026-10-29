import Link from "next/link";
import { SaveManager } from "@/components/SaveManager";

export const metadata = { title: "Settings and save" };

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-xl space-y-4 p-4">
      <Link href="/" className="text-sm text-[var(--accent-2)] underline">
        ← Back
      </Link>
      <h1 className="font-display text-3xl text-[var(--accent)]">Settings and save</h1>
      <SaveManager />
    </main>
  );
}
