"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BattleStage } from "@/game/battle/BattleStage";
import { DRAFTLING_BACK } from "@/game/sprites/creatures/draftling-back";
import { ROUGH_DRAFT } from "@/game/sprites/creatures/rough-draft";
import { OLD_TOWN_DECK } from "@/content/cards/old-town";
import { Bar, CardView } from "@/components/BattleCard";
import type { Card } from "@/lib/battle/cards";
import { type AnswerResult, type BattleState, answer, currentCard, stars, startBattle } from "@/lib/battle/battle";

type Phase = "intro" | "answering" | "resolving" | "feedback" | "over";

export function BattleClient() {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<BattleStage | null>(null);
  const [state, setState] = useState<BattleState>(() => startBattle(OLD_TOWN_DECK, 1));
  const [phase, setPhase] = useState<Phase>("intro");
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [held, setHeld] = useState<Card | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const s = new BattleStage(host.current!, DRAFTLING_BACK, ROUGH_DRAFT);
    stage.current = s;
    void s.init().then(() => s.intro()).then(() => {
      setReady(true);
      setPhase("answering");
    });
    return () => {
      s.destroy();
      stage.current = null;
    };
  }, []);

  // While a result is showing, keep the card that was answered (the state has already moved to the next one).
  const card = (phase === "resolving" || phase === "feedback" ? held : currentCard(state)) ?? undefined;
  const multi = !!card && card.answer.length > 1;

  const toggle = useCallback(
    (i: number) => {
      if (phase !== "answering") return;
      setSelected((cur) => (multi ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i]));
    },
    [phase, multi],
  );

  const submit = useCallback(async () => {
    if (phase !== "answering" || selected.length === 0) return;
    const { state: next, result: r } = answer(state, selected);
    setHeld(currentCard(state) ?? null);
    setPhase("resolving");
    setResult(r);
    setState(next);
    const s = stage.current;
    if (s) {
      if (r.correct) await s.playerStrike(r.damageToFoe);
      else await s.foeStrike(r.damageToPlayer);
      if (next.status === "won") await s.faint("foe");
      else if (next.status === "lost") await s.faint("player");
      await s.beat();
    }
    setPhase("feedback");
  }, [phase, selected, state]);

  const next = useCallback(() => {
    if (phase !== "feedback") return;
    setSelected([]);
    setResult(null);
    setPhase(state.status === "asking" ? "answering" : "over");
  }, [phase, state.status]);

  const rematch = () => {
    window.location.reload();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "9") toggle(Number(e.key) - 1);
      else if (e.key === "Enter") {
        e.preventDefault();
        if (phase === "answering") void submit();
        else if (phase === "feedback") next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, submit, next, phase]);

  const total = OLD_TOWN_DECK.length;
  const earned = stars(state);

  return (
    <main className="fixed inset-0 flex flex-col bg-[var(--bg)] md:flex-row">
      <section className="flex min-h-0 flex-[0_0_36%] flex-col md:flex-[1_1_55%]">
        <div className="flex items-end gap-3 px-3 pt-2">
          <Bar label={ROUGH_DRAFT.name} hp={state.foeHp} max={state.config.foeHp} tone="#e0524b" />
          <Bar label={`DRAFTLING${state.streak >= 2 ? ` ×${state.streak}` : ""}`} hp={state.playerHp} max={state.config.playerHp} tone="#4bd37b" />
        </div>
        <div ref={host} className="relative min-h-0 flex-1" aria-label="Battle stage" />
      </section>

      <section className="panel m-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 md:m-3 md:max-w-xl md:flex-[1_1_45%]" aria-label="Card">
        {phase === "over" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <h1 className="font-display text-3xl text-[var(--accent-2)]">{state.status === "won" ? "VICTORY!" : "DEFEATED"}</h1>
            <div className="text-4xl" aria-label={`${earned} of 3 stars`}>
              {"★".repeat(earned)}
              <span className="text-white/20">{"★".repeat(3 - earned)}</span>
            </div>
            <p className="text-sm text-white/70">
              {state.answered} cards answered, {state.missed.length} missed.
              {state.missed.length > 0 && " Missed cards return in the Daily Review."}
            </p>
            <div className="flex gap-2">
              <button className="px-btn px-btn-primary px-4 py-3" onClick={rematch}>
                Rematch
              </button>
              <a href="../play/" className="px-btn px-4 py-3">
                Back to town
              </a>
            </div>
          </div>
        ) : !ready || !card ? (
          <p className="font-display m-auto text-[var(--accent-2)]">A wild ROUGH DRAFT appears!</p>
        ) : (
          <>
            <CardView
              card={card}
              phase={phase as "answering" | "resolving" | "feedback"}
              selected={selected}
              result={result}
              counter={`${Math.min(state.answered + 1, total)} · ${state.queue.length} left`}
              nextLabel={state.status === "asking" ? "Next card" : "Finish"}
              onToggle={toggle}
              onSubmit={() => void submit()}
              onNext={next}
            />
          </>
        )}
      </section>
    </main>
  );
}
