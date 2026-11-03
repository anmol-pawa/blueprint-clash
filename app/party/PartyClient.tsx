"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DESIGN_PROBLEMS, PATTERNLINGS, hasGlobalStateDebuff, levelFromMastery, patternlingById, problemById, stageForLevel, starterParty, startBattle, pick, type BattleState, type PartyState, type PickOutcome } from "@/lib/patterns";
import { setParty } from "@/lib/save/party";
import { indexedDbSaveStore, loadSave, updateSave, type SaveStore } from "@/lib/save/store";

const EFFECT_LABEL = { super: "Super effective!", neutral: "Works, but heavy", weak: "Not very effective" } as const;

async function saveParty(s: SaveStore, party: PartyState): Promise<void> {
  const { data } = await loadSave(s, Date.now());
  await updateSave(s, data, (d) => setParty(d, party), Date.now());
}

export function PartyClient() {
  const store = useRef<SaveStore | null>(null);
  const [party, setPartyState] = useState<PartyState>(starterParty());
  const [persist, setPersist] = useState<"loading" | "ok" | "off">("loading");
  const [problemId, setProblemId] = useState(DESIGN_PROBLEMS[0].id);
  const [battle, setBattle] = useState<BattleState>(() => startBattle(DESIGN_PROBLEMS[0].id));
  const [last, setLast] = useState<PickOutcome | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        store.current = indexedDbSaveStore();
        const { data, warning } = await loadSave(store.current, Date.now());
        if (!live) return;
        setPartyState(data.party);
        setPersist(warning ? "off" : "ok");
      } catch {
        if (live) setPersist("off");
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const problem = problemById(problemId)!;
  const debuff = hasGlobalStateDebuff(party);
  const families = useMemo(() => ["creational", "structural", "behavioural"] as const, []);

  const begin = (id: string) => {
    setProblemId(id);
    setBattle(startBattle(id));
    setLast(null);
  };

  const choose = (id: string) => {
    if (battle.status !== "active" || battle.picks.includes(id)) return;
    const out = pick(battle, party, id);
    setBattle(out.battle);
    setPartyState(out.party);
    setLast(out);
    const s = store.current;
    if (s && persist === "ok") {
      void saveParty(s, out.party).catch(() => setPersist("off"));
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-display text-3xl text-[var(--accent)]">Party</h1>
        <Link href="/" className="px-btn flex min-h-11 items-center px-3">
          Home
        </Link>
      </header>
      <p className="text-sm text-white/70">
        Match a Patternling to the design smell. A super effective pick befriends it. Reaching for Solo (Singleton) when it is not the best fit builds the Global State debuff.
      </p>
      {persist === "off" && <p className="text-xs text-amber-300">Storage unavailable: progress will not persist.</p>}
      {debuff && (
        <p className="panel p-3 text-sm text-amber-300" role="status">
          Global State debuff: shared mutable state is leaking into your fights. Non-super hits deal 20% less until you land super picks with other Patternlings.
        </p>
      )}

      <section className="panel flex flex-col gap-3 p-4" aria-label="Design battle">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Design problems">
          {DESIGN_PROBLEMS.map((p) => (
            <button key={p.id} role="tab" aria-selected={p.id === problemId} className={`px-btn min-h-11 px-3 text-sm ${p.id === problemId ? "px-btn-primary" : ""}`} onClick={() => begin(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
        <p className="text-sm text-white/85" data-testid="brief">
          {problem.brief}
        </p>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex-1">
            <div className="h-3 w-full overflow-hidden border border-white/40 bg-black/40" role="progressbar" aria-label="Foe HP" aria-valuenow={battle.foeHp} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-[var(--accent)] transition-[width] duration-300" style={{ width: `${battle.foeHp}%` }} />
            </div>
            <span className="text-xs text-white/60">Foe HP {battle.foeHp}/100</span>
          </div>
          <span aria-label={`${battle.hearts} hearts left`} data-testid="hearts">
            {"♥".repeat(Math.max(0, battle.hearts)) + "♡".repeat(Math.max(0, 3 - battle.hearts))}
          </span>
        </div>

        {last && (
          <div className="border border-white/30 p-3 text-sm" aria-live="polite" data-testid="result">
            <b className={last.effectiveness === "super" ? "text-emerald-300" : last.effectiveness === "weak" ? "text-red-300" : "text-amber-300"}>
              {EFFECT_LABEL[last.effectiveness]} {last.damage > 0 && `(-${last.damage})`}
            </b>
            {last.recruited && <span className="ml-2 text-[var(--accent-2)]">New friend!</span>}
            {last.debuffed && <span className="ml-2 text-amber-300">(Global State debuff)</span>}
            <p className="mt-1 text-white/80">{last.explanation}</p>
          </div>
        )}
        {battle.status !== "active" && (
          <div className="flex flex-wrap items-center gap-2" role="status">
            <b className={battle.status === "won" ? "text-emerald-300" : "text-red-300"}>{battle.status === "won" ? "Design defended!" : "The smell wins this round."}</b>
            <button className="px-btn px-btn-primary min-h-11 px-3" onClick={() => begin(problemId)}>
              Try again
            </button>
          </div>
        )}
      </section>

      {families.map((fam) => (
        <section key={fam} aria-label={`${fam} Patternlings`}>
          <h2 className="font-display mb-2 text-lg capitalize text-[var(--accent-2)]">{fam}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {PATTERNLINGS.filter((p) => p.family === fam).map((p) => {
              const owned = party.owned.includes(p.id);
              const lvl = levelFromMastery(party.mastery[p.id] ?? 0);
              const tried = battle.picks.includes(p.id);
              return (
                <button key={p.id} className={`px-btn flex min-h-11 flex-col items-start gap-1 p-3 text-left ${owned ? "" : "opacity-70"}`} disabled={battle.status !== "active" || tried} onClick={() => choose(p.id)}>
                  <span className="text-sm text-[var(--accent-2)]">
                    {p.name} <span className="text-white/50">· {p.pattern}</span>
                  </span>
                  <span className="text-xs text-white/70">{owned ? `Lv ${lvl} · stage ${stageForLevel(lvl)}` : "Not befriended yet (practice loan)"}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <p className="text-xs text-white/50">{party.owned.map((id) => patternlingById(id)?.name).join(", ")} in your party. Art for each Patternling arrives with its district.</p>
    </main>
  );
}
