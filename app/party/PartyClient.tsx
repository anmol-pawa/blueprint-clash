"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PATTERNLINGS, currentProblem, hasGlobalStateDebuff, levelFromMastery, newParty, pickPatternling, stageForLevel, startDesignBattle, type DesignBattleState, type PartyState, type PickResult } from "@/lib/patterns";
import { indexedDbSaveStore, loadSave, updateSave } from "@/lib/save/store";

export function PartyClient() {
  const [party, setParty] = useState<PartyState>(newParty());
  const [battle, setBattle] = useState<DesignBattleState | null>(null);
  const [last, setLast] = useState<PickResult | null>(null);
  const [saveNote, setSaveNote] = useState("");
  const partyRef = useRef(party);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const { data, warning } = await loadSave(indexedDbSaveStore(), Date.now());
        if (live) {
          setParty(data.party);
          partyRef.current = data.party;
          if (warning) setSaveNote(warning);
        }
      } catch {
        if (live) setSaveNote("storage unavailable; progress will not persist");
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const persist = useCallback(async (p: PartyState) => {
    partyRef.current = p;
    setParty(p);
    try {
      const store = indexedDbSaveStore();
      const { data } = await loadSave(store, Date.now());
      await updateSave(store, data, (d) => void (d.party = p), Date.now());
      setSaveNote("");
    } catch {
      setSaveNote("could not save");
    }
  }, []);

  const start = () => {
    setBattle(startDesignBattle(partyRef.current));
    setLast(null);
  };

  const pick = (id: string) => {
    if (!battle || battle.phase !== "fighting") return;
    const r = pickPatternling(battle, id);
    setLast(r);
    setBattle(r.state);
    void persist(r.state.party);
  };

  const problem = battle ? currentProblem(battle) : null;
  const debuff = hasGlobalStateDebuff(party);

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-3 p-3">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl text-[var(--accent-2)]">Patternling party</h1>
        <a href="../" className="px-btn min-h-11 px-4 py-2">Menu</a>
      </header>

      {saveNote && <p className="panel p-2 text-sm text-amber-300" role="status">{saveNote}</p>}
      {debuff && (
        <p className="panel p-2 text-sm text-red-300" role="status" data-testid="debuff">
          Global State: Solo has been overused. Your non-super hits are 20% weaker until you land super-effective picks.
        </p>
      )}

      <section className="panel flex flex-col gap-3 p-3" aria-label="Design battle">
        <h2 className="font-display text-base">Design battle</h2>
        {!battle && (
          <>
            <p className="text-sm text-white/80">Each monster is a design problem. Pick the Patternling whose pattern fits: a fit is super effective and recruits it, a heavier pick is neutral (YAGNI), a wrong pick costs a heart.</p>
            <button className="px-btn px-btn-primary min-h-11 self-start px-4 py-2" onClick={start}>Start battle</button>
          </>
        )}
        {battle && problem && (
          <div className="flex flex-col gap-1" data-testid="monster">
            <p className="font-display text-[var(--accent-2)]">{problem.name} <span className="text-xs text-white/60">({battle.index + 1}/{battle.problems.length})</span></p>
            <p className="text-sm">{problem.brief}</p>
            <p className="text-xs text-white/70" data-testid="stats">Monster HP {battle.foeHp} · Hearts {"♥".repeat(battle.hearts)}</p>
          </div>
        )}
        {battle && battle.phase !== "fighting" && (
          <div className="flex flex-col gap-2" data-testid="battle-over">
            <p className="font-display">{battle.phase === "won" ? "All design problems solved." : "Out of hearts. Review the explanations and try again."}</p>
            <button className="px-btn px-btn-primary min-h-11 self-start px-4 py-2" onClick={start}>Play again</button>
          </div>
        )}
        {last && (
          <p className="text-sm" role="status" aria-live="polite" data-testid="feedback">
            <strong>{last.matchup.effectiveness === "super" ? "Super effective! " : last.matchup.effectiveness === "neutral" ? "Neutral. " : "Not very effective. "}</strong>
            {last.matchup.explanation} (damage {last.damage})
          </p>
        )}
      </section>

      <section aria-label="Roster" className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {PATTERNLINGS.map((p) => {
          const owned = party.owned.includes(p.id);
          const lvl = levelFromMastery(party.mastery[p.id] ?? 0);
          const canPick = !!problem;
          return (
            <button
              key={p.id}
              className={`panel flex min-h-11 flex-col gap-1 p-2 text-left ${owned ? "" : "opacity-60"}`}
              disabled={!canPick}
              onClick={() => pick(p.id)}
              data-testid={`pl-${p.id}`}
            >
              <span className="font-display text-sm">{p.name} <span className="text-xs text-white/60">{owned ? `Lv ${lvl} · stage ${stageForLevel(lvl)}` : "not met"}</span></span>
              <span className="text-xs text-[var(--accent-2)]">{p.pattern} · {p.family}</span>
              <span className="text-xs text-white/80">{p.solves}</span>
              {owned && <span className="text-xs text-white/60">Cost: {p.cost}</span>}
            </button>
          );
        })}
      </section>
    </main>
  );
}
