"use client";
import { useEffect, useRef } from "react";
import type { AnswerResult } from "@/lib/battle/battle";
import type { Card } from "@/lib/battle/cards";

export const KIND_LABEL = { mcq: "CONCEPT", pattern: "WHICH PATTERN?", smell: "SMELL SPOTTER", predict: "PREDICT THE OUTPUT" } as const;

export function Bar({ label, hp, max, tone }: { label: string; hp: number; max: number; tone: string }) {
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

export type CardPhase = "answering" | "resolving" | "feedback";

interface Props {
  card: Card;
  phase: CardPhase;
  selected: number[];
  result: AnswerResult | null;
  /** Shown on the right of the header, e.g. "3 left". */
  counter: string;
  nextLabel: string;
  onToggle: (i: number) => void;
  onSubmit: () => void;
  onNext: () => void;
}

/** The question half of a card battle: prompt, code, options, Attack and the explanation. */
export function CardView({ card, phase, selected, result, counter, nextLabel, onToggle, onSubmit, onNext }: Props) {
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase === "feedback") feedbackRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
  }, [phase]);
  const multi = card.answer.length > 1;
  return (
    <>
      <div className="font-display flex justify-between text-xs text-[var(--accent-2)]">
        <span>{KIND_LABEL[card.kind]}</span>
        <span>{counter}</span>
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
          // `.px-btn` is unlayered CSS and beats Tailwind utilities (even for its own variables), so tint it inline.
          const tint = showKey && isAnswer ? ["#166534", "#34d399"] : showKey && chosen ? ["#7f1d1d", "#f87171"] : chosen ? ["#0c4a6e", "#38bdf8"] : null;
          return (
            <button
              key={o}
              role={multi ? "checkbox" : "radio"}
              aria-checked={chosen}
              disabled={phase !== "answering"}
              onClick={() => onToggle(i)}
              style={{
                ...(card.kind === "predict" ? { fontFamily: "ui-monospace, monospace" } : {}),
                ...(tint ? ({ "--btn": tint[0], "--btn-hi": tint[1] } as React.CSSProperties) : {}),
                ...(showKey && tint ? { opacity: 1 } : {}),
              }}
              className="px-btn min-h-11 px-3 py-2 text-left text-sm"
            >
              <span className="mr-2 text-white/50">{i + 1}</span>
              <span className="whitespace-pre-wrap">{o}</span>
            </button>
          );
        })}
      </div>
      {phase === "answering" && (
        <button className="px-btn px-btn-primary mt-1 min-h-11 px-4 py-2" disabled={selected.length === 0} onClick={onSubmit}>
          Attack!
        </button>
      )}
      {phase === "feedback" && result && (
        <div ref={feedbackRef} className="mt-1 flex shrink-0 flex-col gap-2" role="status">
          <div className={`font-display text-lg ${result.correct ? "text-emerald-300" : "text-red-300"}`}>{result.correct ? `Hit! −${result.damageToFoe}` : `Countered! −${result.damageToPlayer}`}</div>
          <p className="text-sm leading-snug text-white/85">{result.explain}</p>
          <button className="px-btn px-btn-primary min-h-11 px-4 py-2" onClick={onNext}>
            {nextLabel}
          </button>
        </div>
      )}
    </>
  );
}
