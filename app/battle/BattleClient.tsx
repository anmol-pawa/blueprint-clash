"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BattleStage } from "@/game/battle/BattleStage";
import { DRAFTLING_BACK } from "@/game/sprites/creatures/draftling-back";
import { ROUGH_DRAFT } from "@/game/sprites/creatures/rough-draft";
import { getDeck } from "@/content/decks";
import { DUEL_CONFIG, duelFlag, getTrainer, trainerCards } from "@/content/trainers";
import { AudioToggle } from "@/components/AudioToggle";
import { Bar, CardView } from "@/components/BattleCard";
import { sfx, startMusic, stopMusic } from "@/game/audio/synth";
import type { Card } from "@/lib/battle/cards";
import { indexedDbSaveStore, loadSave, updateSave } from "@/lib/save/store";
import { recordAnswer } from "@/lib/srs";
import { type AnswerResult, type BattleState, answer, currentCard, stars, startBattle } from "@/lib/battle/battle";

type Phase = "intro" | "answering" | "resolving" | "feedback" | "over";

export function BattleClient({ deckId, trainerId }: { deckId: string; trainerId?: string }) {
  const deck = getDeck(deckId);
  const trainer = getTrainer(trainerId);
  const [cards] = useState<Card[]>(() => (trainer ? trainerCards(trainer, Math.floor(Math.random() * 997)) : deck.cards));
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<BattleStage | null>(null);
  const [state, setState] = useState<BattleState>(() => (trainer ? startBattle(cards, 1, { ...DUEL_CONFIG }) : startBattle(cards, 1)));
  const [phase, setPhase] = useState<Phase>("intro");
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [held, setHeld] = useState<Card | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    startMusic("old-town");
    return () => stopMusic();
  }, []);

  useEffect(() => {
    const s = new BattleStage(host.current!, DRAFTLING_BACK, ROUGH_DRAFT, deck.scene);
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
    if (r.correct) sfx.correct();
    else sfx.wrong();
    const s = stage.current;
    if (s) {
      if (r.correct) await s.playerStrike(r.damageToFoe);
      else await s.foeStrike(r.damageToPlayer);
      if (next.status === "won") await s.faint("foe");
      else if (next.status === "lost") await s.faint("player");
      if (next.status === "won") sfx.victory();
      else if (next.status === "lost") sfx.defeat();
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

  // Feed misses to the spaced-repetition queue once, when the battle ends (best effort: storage may be unavailable).
  const fed = useRef(false);
  useEffect(() => {
    if (phase !== "over" || fed.current || state.missed.length === 0) return;
    fed.current = true;
    void (async () => {
      try {
        const store = indexedDbSaveStore();
        const { data, warning } = await loadSave(store, Date.now());
        if (warning) return;
        await updateSave(store, data, (d) => state.missed.forEach((id) => recordAnswer(d.srs, id, false, Date.now())), Date.now());
      } catch {
        /* storage unavailable: the review queue just will not include these */
      }
    })();
  }, [phase, state.missed]);

  // A won trainer duel is recorded once (as a `duel:<id>` entry in lessonsDone) when the battle ends.
  const flagged = useRef(false);
  useEffect(() => {
    if (!trainer || phase !== "over" || state.status !== "won" || flagged.current) return;
    flagged.current = true;
    void (async () => {
      try {
        const store = indexedDbSaveStore();
        const { data, warning } = await loadSave(store, Date.now());
        if (warning) return;
        await updateSave(store, data, (d) => {
          if (!d.lessonsDone.includes(duelFlag(trainer))) d.lessonsDone.push(duelFlag(trainer));
        }, Date.now());
      } catch {
        /* storage unavailable: the win is just not remembered */
      }
    })();
  }, [phase, state.status, trainer]);

  const total = cards.length;
  const earned = stars(state);

  return (
    <main className="fixed inset-0 flex flex-col bg-[var(--bg)] md:flex-row">
      <section className="flex min-h-0 flex-[0_0_36%] flex-col md:flex-[1_1_55%]">
        <div className="flex items-end gap-3 px-3 pt-2">
          <Bar label={trainer ? trainer.foeName : ROUGH_DRAFT.name} hp={state.foeHp} max={state.config.foeHp} tone="#e0524b" />
          <AudioToggle />
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
            {trainer && <p className="text-sm text-[var(--accent-2)]">{state.status === "won" ? trainer.win : trainer.lose}</p>}
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
          <p className="font-display m-auto text-center text-[var(--accent-2)]">
            {trainer ? `${trainer.name} challenges you!` : "A wild ROUGH DRAFT appears!"}
            <span className="mt-1 block text-xs text-white/60">{trainer ? trainer.intro : `${deck.title} deck`}</span>
          </p>
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
