"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BattleStage } from "@/game/battle/BattleStage";
import { DRAFTLING_BACK } from "@/game/sprites/creatures/draftling-back";
import { ROUGH_DRAFT } from "@/game/sprites/creatures/rough-draft";
import { OLD_TOWN_DECK } from "@/content/cards/old-town";
import { type AnswerResult, type BattleState, answer, currentCard, stars, startBattle } from "@/lib/battle/battle";

const KIND_LABEL = { mcq: "CONCEPT", pattern: "WHICH PATTERN?", smell: "SMELL SPOTTER", predict: "PREDICT THE OUTPUT" } as const;

function Bar({ label, hp, max, tone }: { label: string; hp: number; max: number; tone: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="font-display flex justify-between text-xs">
        <span>{label}</span>
        <span>
          {hp}/{max}
        </span>
      </div>
      <div className="h-3 border-2 border-[#060d20] bg-[#060d20]" role="progressbar" aria-label={`${label} HP`} aria-valuenow={hp} aria-valuemax={max}>
        <div className="h-full transition-[width] duration-500" style={{ width: `${(hp / max) * 100}%`, background: tone }} />
      </div>
    </div>
  );
}

type Phase = "intro" | "answering" | "resolving" | "feedback" | "over";

export function BattleClient() {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<BattleStage | null>(null);
  const [state, setState] = useState<BattleState>(() => startBattle(OLD_TOWN_DECK, 1));
  const [phase, setPhase] = useState<Phase>("intro");
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [ready, setReady] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "feedback") feedbackRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
  }, [phase]);

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

  const card = currentCard(state);
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
              <a href="./play" className="px-btn px-4 py-3">
                Back to town
              </a>
            </div>
          </div>
        ) : !ready || !card ? (
          <p className="font-display m-auto text-[var(--accent-2)]">A wild ROUGH DRAFT appears!</p>
        ) : (
          <>
            <div className="font-display flex justify-between text-xs text-[var(--accent-2)]">
              <span>{KIND_LABEL[card.kind]}</span>
              <span>
                {Math.min(state.answered + 1, total)} · {state.queue.length} left
              </span>
            </div>
            <p className="shrink-0 text-base leading-snug">{card.prompt}</p>
            {"code" in card && (
              <pre className="max-h-48 shrink-0 overflow-auto rounded border-2 border-[#060d20] bg-[#07102a] p-2 text-xs leading-snug" tabIndex={0}>
                <code>{card.code}</code>
              </pre>
            )}
            {multi && <p className="text-xs text-white/60">Choose all that apply.</p>}
            <div className="flex shrink-0 flex-col gap-2" role={multi ? "group" : "radiogroup"}>
              {card.options.map((o, i) => {
                const chosen = selected.includes(i);
                const isAnswer = card.answer.includes(i);
                const showKey = phase === "feedback" || phase === "resolving";
                const tone = showKey && isAnswer ? "border-emerald-400 bg-emerald-900/40" : showKey && chosen ? "border-red-400 bg-red-900/40" : chosen ? "border-[var(--accent)] bg-sky-900/40" : "";
                return (
                  <button
                    key={o}
                    role={multi ? "checkbox" : "radio"}
                    aria-checked={chosen}
                    disabled={phase !== "answering"}
                    onClick={() => toggle(i)}
                    style={card.kind === "predict" ? { fontFamily: "ui-monospace, monospace" } : undefined}
                    className={`px-btn min-h-11 px-3 py-2 text-left text-sm ${tone}`}
                  >
                    <span className="mr-2 text-white/50">{i + 1}</span>
                    <span className="whitespace-pre-wrap">{o}</span>
                  </button>
                );
              })}
            </div>
            {phase === "answering" && (
              <button className="px-btn px-btn-primary mt-1 min-h-11 px-4 py-2" disabled={selected.length === 0} onClick={() => void submit()}>
                Attack!
              </button>
            )}
            {phase === "feedback" && result && (
              <div ref={feedbackRef} className="mt-1 flex shrink-0 flex-col gap-2" role="status">
                <div className={`font-display text-lg ${result.correct ? "text-emerald-300" : "text-red-300"}`}>{result.correct ? `Hit! −${result.damageToFoe}` : `Countered! −${result.damageToPlayer}`}</div>
                <p className="text-sm leading-snug text-white/85">{result.explain}</p>
                <button className="px-btn px-btn-primary min-h-11 px-4 py-2" onClick={next}>
                  {state.status === "asking" ? "Next card" : "Finish"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
