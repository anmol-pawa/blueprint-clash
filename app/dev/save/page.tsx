"use client";
import { useRef, useState } from "react";
import { exportSave, getStore, importSave, level, useSave } from "@/lib/save";

/** Dev page for the save system; the same controls move into the Settings screen later. */
export default function SavePage() {
  const save = useSave();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState(() => (typeof window === "undefined" ? "" : (getStore().loadWarning() ?? "")));

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportSave(getStore().get())], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "blueprint-clash-save.json";
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Save exported.");
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const r = importSave(await f.text());
    if (r.ok) {
      getStore().replace(r.save);
      setMsg("Save imported.");
    } else setMsg(r.error);
    if (file.current) file.current.value = "";
  };

  const btn = "min-h-11 rounded border border-slate-500 px-4 py-2 text-left hover:bg-slate-800";
  return (
    <main className="mx-auto max-w-xl space-y-4 p-4 text-slate-100">
      <h1 className="text-xl font-bold">Save system</h1>
      <p data-testid="summary">
        Level {level(save.xp)} · {save.xp} XP · {save.bits} bits · {save.badges.length} badges
      </p>
      <div className="flex flex-wrap gap-2">
        <button className={btn} onClick={() => getStore().update((s) => ({ ...s, xp: s.xp + 100, bits: s.bits + 5 }))}>
          +100 XP, +5 bits
        </button>
        <button className={btn} onClick={() => getStore().update((s) => ({ ...s, settings: { ...s.settings, zen: !s.settings.zen } }))}>
          Zen mode: {save.settings.zen ? "on" : "off"}
        </button>
        <button className={btn} onClick={download}>
          Export save
        </button>
        <button className={btn} onClick={() => file.current?.click()}>
          Import save
        </button>
        <button
          className={btn}
          onClick={() => {
            if (window.confirm("Erase all progress on this device?")) {
              getStore().reset();
              setMsg("Progress erased.");
            }
          }}
        >
          Reset
        </button>
      </div>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <p role="status" data-testid="msg" className="min-h-6 text-amber-300">
        {msg}
      </p>
    </main>
  );
}
