"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardView } from "@/components/BattleCard";
import { OLD_TOWN_DECK } from "@/content/cards/old-town";
import { rng, shuffleOptions, type AnswerResult } from "@/lib/battle/battle";
import { isCorrect, type Card } from "@/lib/battle/cards";
import { indexedDbSaveStore, loadSave, memorySaveStore, updateSave, type SaveStore } from "@/lib/save/store";
import type { SaveData } from "@/lib/save/schema";
import { MASTERY_ORDER, buildQueue, masteryState, recordAnswer, rustLevel, type MasteryState } from "@/lib/srs";

const RUST = ["", "Dusty", "Rusty"] as const;

export function ReviewClient() {
  const store = useRef<SaveStore | null>(null);
  const [save, setSave] = useState<SaveData | null>(null);
  const [persist, setPersist] = useState<"ok" | "off">("ok");
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [right, setRight] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let live = true;
    void (async () => {
      let data: SaveData;
      try {
        store.current = indexedDbSaveStore();
        const out = await loadSave(store.current, Date.now());
        data = out.data;
        if (out.warning) setPersist("off");
      } catch {
        const out = await loadSave(memorySaveStore(), Date.now());
        data = out.data;
        setPersist("off");
      }
      if (!live) return;
      const now = Date.now();
      setNow(now);
      const ids = buildQueue(data.srs, OLD_TOWN_DECK.map((c) => c.id), now);
      const rand = rng(now & 0xffff);
      setSave(data);
      setQueue(ids.map((id) => shuffleOptions(OLD_TOWN_DECK.find((c) => c.id === id)!, rand)));
    })();
    return () => {
      live = false;
    };
  }, []);

  const card = queue?.[idx];

  const submit = useCallback(() => {
    if (!card || result || selected.length === 0 || !save) return;
    const ok = isCorrect(card, selected);
    setResult({ correct: ok, damageToFoe: 0, damageToPlayer: 0, explain: card.explain });
    if (ok) setRight((n) => n + 1);
    const s = store.current;
    const apply = (d: SaveData) => recordAnswer(d.srs, card.id, ok, Date.now());
    if (s && persist === "ok") {
      void updateSave(s, save, apply, Date.now())
        .then(setSave)
        .catch(() => setPersist("off"));
    } else {
      const next = structuredClone(save);
      apply(next);
      setSave(next);
    }
  }, [card, result, selected, save, persist]);

  const next = () => {
    setSelected([]);
    setResult(null);
    setIdx((i) => i + 1);
  };

  const toggle = (i: number) => {
    if (result || !card) return;
    setSelected((cur) => (card.answer.length > 1 ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i]));
  };

  const mastery = useMemo(() => {
    const counts: Record<MasteryState, number> = { unseen: 0, seen: 0, learning: 0, practiced: 0, mastered: 0, ingrained: 0 };
    if (!save) return { counts, rusty: 0 };
    let rusty = 0;
    for (const c of OLD_TOWN_DECK) {
      counts[masteryState(save.srs[c.id])] += 1;
      if (rustLevel(save.srs[c.id], now) > 0) rusty += 1;
    }
    return { counts, rusty };
  }, [save, now]);

  const done = queue !== null && idx >= queue.length;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-3 p-3">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl text-[var(--accent-2)]">DAILY REVIEW</h1>
        <Link href="/" className="px-btn px-4 py-3">Menu</Link>
      </header>
      {persist === "off" && <p className="panel p-2 text-xs text-white/70">Progress cannot be saved in this browser; reviews will not persist.</p>}
      <section className="panel p-3" aria-label="Mastery">
        <div className="font-display mb-1 text-xs text-white/60">MASTERY (Old Town deck, {OLD_TOWN_DECK.length} cards)</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {MASTERY_ORDER.map((m) => (
            <span key={m}>
              {m} <b>{mastery.counts[m]}</b>
            </span>
          ))}
        </div>
        {mastery.rusty > 0 && <p className="mt-1 text-xs text-[#e0a64b]">{mastery.rusty} overdue: rust is creeping onto those cards.</p>}
      </section>
      <section className="panel flex flex-1 flex-col gap-2 p-3" aria-label="Review card">
        {queue === null ? (
          <p className="m-auto text-sm text-white/70">Loading your review...</p>
        ) : queue.length === 0 ? (
          <div className="m-auto text-center">
            <h2 className="font-display text-lg">All caught up</h2>
            <p className="text-sm text-white/70">Nothing is due. Come back tomorrow, or battle for new cards.</p>
            <Link href="/battle" className="px-btn px-btn-primary mt-3 inline-block px-4 py-3">Concept battle</Link>
          </div>
        ) : done ? (
          <div className="m-auto text-center">
            <h2 className="font-display text-lg text-[var(--accent-2)]">Review done</h2>
            <p className="text-sm text-white/70">
              {right} of {queue.length} right. Misses come back in 10 minutes; correct cards return after 1, 3, then longer gaps.
            </p>
            <Link href="/party" className="px-btn px-btn-primary mt-3 inline-block px-4 py-3">Pattern duel</Link>
          </div>
        ) : (
          card && (
            <>
              {save && RUST[rustLevel(save.srs[card.id], now)] && (
                <span className="font-display text-xs text-[#e0a64b]">{RUST[rustLevel(save.srs[card.id], now)]}: overdue</span>
              )}
              <CardView
                card={card}
                phase={result ? "feedback" : "answering"}
                selected={selected}
                result={result}
                counter={`${idx + 1} / ${queue.length}`}
                nextLabel={idx + 1 >= queue.length ? "Finish" : "Next"}
                onToggle={toggle}
                onSubmit={submit}
                onNext={next}
              />
            </>
          )
        )}
      </section>
    </main>
  );
}
