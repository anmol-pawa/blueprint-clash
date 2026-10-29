"use client";
import { useCallback, useEffect, useState } from "react";
import { indexedDbSaveStore } from "@/lib/save/store";
import { exportSave, importSave } from "@/lib/save/transfer";
import { updateSettings } from "@/lib/save/actions";
import { newSave, type SaveData, type Settings } from "@/lib/save/types";

const TOGGLES: { key: keyof Settings; label: string }[] = [
  { key: "sound", label: "Sound effects" },
  { key: "music", label: "Music" },
  { key: "reducedMotion", label: "Reduced motion" },
];

export function SaveManager() {
  const [store] = useState(() => indexedDbSaveStore());
  const [save, setSave] = useState<SaveData | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void (async () => {
      let s: SaveData | null = null;
      try {
        s = await store.load();
      } catch {
        /* storage unavailable: play in memory */
      }
      setSave(s ?? newSave(Date.now()));
    })();
  }, [store]);

  const commit = useCallback(
    async (next: SaveData, ok: string) => {
      setSave(next);
      try {
        await store.save(next);
        setMsg(ok);
      } catch {
        setMsg("Could not write to browser storage (private mode?). Export your save to keep it.");
      }
    },
    [store],
  );

  const download = () => {
    if (!save) return;
    const url = URL.createObjectURL(new Blob([exportSave(save)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `blueprint-clash-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Save exported.");
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const r = importSave(await file.text(), Date.now());
    if (r.ok) await commit(r.save, "Save imported. The previous save is kept as a backup.");
    else setMsg(`Import failed: ${r.error}`);
  };

  const restoreBackup = async () => {
    const b = await store.loadBackup();
    if (b) await commit(b, "Backup restored.");
    else setMsg("No backup yet.");
  };

  if (!save) return <p className="text-white/70">Loading save…</p>;
  const done = Object.keys(save.completions).length;

  return (
    <div className="space-y-4">
      <section className="panel space-y-2 p-4" aria-label="Progress">
        <h2 className="font-display text-xl text-[var(--accent-2)]">{save.playerName}</h2>
        <p className="text-sm text-white/70">
          {done} problem{done === 1 ? "" : "s"} completed · {save.badges.length} badge{save.badges.length === 1 ? "" : "s"} · {save.bits} bits
        </p>
      </section>

      <section className="panel space-y-1 p-4" aria-label="Settings">
        <h2 className="font-display text-xl text-[var(--accent-2)]">Settings</h2>
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex min-h-11 items-center justify-between gap-3">
            <span>{t.label}</span>
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={save.settings[t.key]}
              onChange={(e) => void commit(updateSettings(save, { [t.key]: e.target.checked }, Date.now()), "Saved.")}
            />
          </label>
        ))}
      </section>

      <section className="panel space-y-2 p-4" aria-label="Backup">
        <h2 className="font-display text-xl text-[var(--accent-2)]">Backup</h2>
        <p className="text-sm text-white/70">
          Your progress lives only in this browser. Export it to move devices or keep a safety copy.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="px-btn px-btn-primary inline-flex min-h-11 items-center justify-center px-4" onClick={download}>
            Export save
          </button>
          <label className="px-btn inline-flex min-h-11 cursor-pointer items-center justify-center px-4">
            Import save
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void onImport(e.target.files?.[0])} />
          </label>
          <button className="px-btn inline-flex min-h-11 items-center justify-center px-4" onClick={() => void restoreBackup()}>
            Restore backup
          </button>
        </div>
        <p role="status" className="min-h-6 text-sm text-[var(--accent-2)]">
          {msg}
        </p>
      </section>
    </div>
  );
}
