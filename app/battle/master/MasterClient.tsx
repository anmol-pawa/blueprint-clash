"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, CardView } from "@/components/BattleCard";
import { Prose } from "@/components/Prose";
import { WorkspaceEditor } from "@/components/WorkspaceEditor";
import { OLD_TOWN_MASTER, oldTownMasterDeck } from "@/content/masters/old-town";
import { BattleStage } from "@/game/battle/BattleStage";
import { DRAFTLING_BACK } from "@/game/sprites/creatures/draftling-back";
import { WARDEN_VANE } from "@/game/sprites/creatures/warden-vane";
import type { AnswerResult } from "@/lib/battle/battle";
import type { Card } from "@/lib/battle/cards";
import { earnsBadge, masterAnswer, masterCard, masterHpFraction, masterStars, startMaster, submitWorkshop, type MasterState } from "@/lib/battle/master";
import { exerciseHidden, exerciseProvided, type ExerciseBundle } from "@/lib/exercises/bundle";
import { judgeInBrowser } from "@/lib/judge/browser/client";
import { awardBadge } from "@/lib/save/progress";
import { indexedDbSaveStore, loadSave, updateSave } from "@/lib/save/store";

type Ui = "intro" | "answering" | "resolving" | "feedback" | "banner" | "workshop" | "over";
const PHASE_LABEL = { cards: "PHASE 1 · CONCEPTS", workshop: "PHASE 2 · BUILD", smell: "PHASE 3 · SMELL BOSS", won: "VICTORY", lost: "DEFEATED" } as const;

export function MasterClient({ exercise }: { exercise: ExerciseBundle }) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<BattleStage | null>(null);
  const deck = useMemo(() => oldTownMasterDeck(), []);
  const [m, setM] = useState<MasterState>(() => startMaster(deck, 7));
  const mRef = useRef(m);
  const [ui, setUi] = useState<Ui>("intro");
  const [line, setLine] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [held, setHeld] = useState<Card | null>(null);
  const [ready, setReady] = useState(false);
  const [hints, setHints] = useState(0);
  const [note, setNote] = useState("");
  const [badge, setBadge] = useState<"" | "saved" | "failed">("");

  const commit = (next: MasterState) => {
    mRef.current = next;
    setM(next);
  };

  useEffect(() => {
    const s = new BattleStage(host.current!, DRAFTLING_BACK, WARDEN_VANE);
    stage.current = s;
    void s.init().then(() => s.intro()).then(() => setReady(true));
    return () => {
      s.destroy();
      stage.current = null;
    };
  }, []);

  // Badge is written once, on victory.
  useEffect(() => {
    if (!earnsBadge(m)) return;
    let live = true;
    (async () => {
      try {
        const store = indexedDbSaveStore();
        const { data } = await loadSave(store, Date.now());
        await updateSave(store, data, (d) => awardBadge(d, OLD_TOWN_MASTER.badge), Date.now());
        if (live) setBadge("saved");
      } catch {
        if (live) setBadge("failed");
      }
    })();
    return () => {
      live = false;
    };
  }, [m]);

  const card = (ui === "resolving" || ui === "feedback" ? held : masterCard(m)) ?? undefined;
  const multi = !!card && card.answer.length > 1;

  const toggle = useCallback(
    (i: number) => {
      if (ui !== "answering") return;
      setSelected((cur) => (multi ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i]));
    },
    [ui, multi],
  );

  const afterFight = (s: MasterState) => (s.phase === "won" || s.phase === "lost" ? "over" : s.phase === "cards" || s.phase === "smell" ? "answering" : "banner");

  const submit = useCallback(async () => {
    if (ui !== "answering" || selected.length === 0) return;
    const { state: next, result: r } = masterAnswer(mRef.current, selected);
    setHeld(masterCard(mRef.current) ?? null);
    setUi("resolving");
    setResult(r);
    commit(next);
    const s = stage.current;
    if (s) {
      if (r.correct) await s.playerStrike(r.damageToFoe);
      else await s.foeStrike(r.damageToPlayer);
      if (next.phase === "won") await s.faint("foe");
      else if (next.phase === "lost") await s.faint("player");
      await s.beat();
    }
    setUi("feedback");
  }, [ui, selected]);

  const next = useCallback(() => {
    if (ui !== "feedback") return;
    setSelected([]);
    setResult(null);
    setUi(afterFight(mRef.current));
  }, [ui]);

  const advance = useCallback(() => {
    if (ui === "intro") {
      if (line + 1 < OLD_TOWN_MASTER.intro.length) setLine(line + 1);
      else setUi("answering");
    } else if (ui === "banner") {
      setUi(mRef.current.phase === "workshop" ? "workshop" : "answering");
    }
  }, [ui, line]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest(".cm-editor") || /^(input|textarea|select)$/i.test(t.tagName))) return;
      if (e.key >= "1" && e.key <= "9") toggle(Number(e.key) - 1);
      else if (e.key === "Enter") {
        if (t && t.tagName === "BUTTON") return; // the focused button handles its own Enter
        e.preventDefault();
        if (ui === "answering") void submit();
        else if (ui === "feedback") next();
        else if (ui === "intro" || ui === "banner") advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, submit, next, advance, ui]);

  const onJudged = async (mode: "run" | "submit", res: Awaited<ReturnType<typeof judgeInBrowser>>) => {
    if (mode !== "submit" || mRef.current.phase !== "workshop") return;
    const total = Math.max(res.summary.tests.length, exercise.testCount);
    const passed = res.verdict === "compile_error" ? 0 : res.summary.passed;
    const out = submitWorkshop(mRef.current, { passed, total });
    commit(out.state);
    setNote(out.beaten ? `All ${total} tests pass.` : `${passed}/${total} tests pass. The master strikes back for ${out.damageToPlayer}.`);
    const s = stage.current;
    if (s) {
      if (out.beaten) await s.playerStrike(12);
      else await s.foeStrike(out.damageToPlayer);
      if (out.state.phase === "lost") await s.faint("player");
    }
    if (out.state.phase !== "workshop") setUi(out.state.phase === "lost" ? "over" : "banner");
  };

  const stars = masterStars(m);
  const foeHp = Math.round(masterHpFraction(m) * 100);
  const attemptsLeft = m.config.workshopMaxAttempts - m.workshopFails;

  return (
    <main className="fixed inset-0 flex flex-col bg-[var(--bg)] md:flex-row">
      <section className="flex min-h-0 flex-[0_0_32%] flex-col md:flex-[1_1_45%]">
        <div className="flex items-end gap-3 px-3 pt-2">
          <Bar label={OLD_TOWN_MASTER.name.toUpperCase()} hp={foeHp} max={100} tone="#e0524b" />
          <Bar label={`DRAFTLING${m.battle && m.battle.streak >= 2 ? ` ×${m.battle.streak}` : ""}`} hp={m.playerHp} max={m.config.playerHp} tone="#4bd37b" />
        </div>
        <div className="font-display px-3 text-[10px] tracking-widest text-[var(--accent-2)]" data-testid="phase">
          {PHASE_LABEL[m.phase]}
        </div>
        <div ref={host} className="relative min-h-0 flex-1" aria-label="Battle stage" />
      </section>

      <section className="panel m-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 md:m-3 md:flex-[1_1_55%]" aria-label="Fight">
        {ui === "over" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center" data-testid="over">
            <h1 className="font-display text-3xl text-[var(--accent-2)]">{m.phase === "won" ? "GATE BADGE EARNED" : "DEFEATED"}</h1>
            {m.phase === "won" ? (
              <>
                <div className="text-4xl" aria-label={`${stars} of 3 stars`}>
                  {"★".repeat(stars)}
                  <span className="text-white/20">{"★".repeat(3 - stars)}</span>
                </div>
                {OLD_TOWN_MASTER.win.map((l) => (
                  <p key={l} className="max-w-md text-sm text-white/85">“{l}”</p>
                ))}
                <p className="text-xs text-white/60">{badge === "failed" ? "Could not save the badge (storage unavailable)." : badge === "saved" ? "Badge saved." : "Saving badge…"}</p>
              </>
            ) : (
              <>
                <p className="max-w-md text-sm text-white/85">“{OLD_TOWN_MASTER.lose}”</p>
                <p className="text-xs text-white/60">Lost in the {m.endedIn === "workshop" ? "build" : m.endedIn === "smell" ? "smell boss" : "concept"} phase.{m.missed.length > 0 && ` ${m.missed.length} card${m.missed.length === 1 ? "" : "s"} missed.`}</p>
              </>
            )}
            <div className="flex gap-2">
              <button className="px-btn px-btn-primary px-4 py-3" onClick={() => window.location.reload()}>
                {m.phase === "won" ? "Fight again" : "Rematch"}
              </button>
              <a href="../../play/" className="px-btn px-4 py-3">
                Back to town
              </a>
            </div>
          </div>
        ) : ui === "intro" || ui === "banner" ? (
          <div className="flex flex-1 flex-col justify-center gap-3" data-testid="dialogue">
            <div className="font-display text-sm text-[var(--accent-2)]">{OLD_TOWN_MASTER.name} · {OLD_TOWN_MASTER.title}</div>
            <p className="min-h-[3.5rem] text-lg leading-snug">
              {ui === "intro" ? (ready ? OLD_TOWN_MASTER.intro[line] : `${OLD_TOWN_MASTER.name} blocks the gate!`) : m.phase === "workshop" ? OLD_TOWN_MASTER.phaseLines.workshop : OLD_TOWN_MASTER.phaseLines.smell}
            </p>
            <button className="px-btn px-btn-primary min-h-11 self-end px-4 py-2" disabled={ui === "intro" && !ready} onClick={advance}>
              {ui === "intro" && line + 1 >= OLD_TOWN_MASTER.intro.length ? "Begin the trial" : ui === "banner" ? (m.phase === "workshop" ? "To the workbench" : "Face the smell boss") : "Next"}
            </button>
          </div>
        ) : ui === "workshop" ? (
          <div className="flex min-h-0 flex-col gap-2" data-testid="workshop-phase">
            <div className="font-display flex flex-wrap justify-between gap-2 text-xs text-[var(--accent-2)]">
              <span>BUILD · {exercise.title}</span>
              <span data-testid="attempts">{attemptsLeft} submit{attemptsLeft === 1 ? "" : "s"} left</span>
            </div>
            <Prose md={exercise.prompt} />
            <p className="text-xs text-white/60">Run tries the hidden tests for free. Submit is your attack: every test must pass, and a miss costs {m.config.workshopMissDamage} HP.</p>
            {note && <p className="rounded border border-amber-400/50 bg-amber-900/20 p-2 text-sm" role="status" data-testid="ws-note">{note}</p>}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button className="px-btn min-h-11 px-3" disabled={hints >= 3} onClick={() => setHints(hints + 1)}>
                Hint ({hints}/3)
              </button>
              {hints > 0 && <ol className="w-full list-decimal space-y-1 pl-5 text-xs text-white/80">{exercise.hints.slice(0, hints).map((h) => <li key={h}><Prose md={h} /></li>)}</ol>}
            </div>
            <WorkspaceEditor
              id={`master-${exercise.id}`}
              provided={exerciseProvided(exercise)}
              starter={exercise.starter}
              runExtras={exerciseHidden(exercise)}
              submitExtras={exerciseHidden(exercise)}
              judge={(files) => judgeInBrowser(files, 10000)}
              onJudged={(mode, res) => void onJudged(mode, res)}
            />
          </div>
        ) : !card ? (
          <p className="font-display m-auto text-[var(--accent-2)]">…</p>
        ) : (
          <CardView
            card={card}
            phase={ui as "answering" | "resolving" | "feedback"}
            selected={selected}
            result={result}
            counter={`${m.battle?.queue.length ?? 0} left`}
            nextLabel={m.phase === "won" || m.phase === "lost" ? "Finish" : "Next"}
            onToggle={toggle}
            onSubmit={() => void submit()}
            onNext={next}
          />
        )}
      </section>
    </main>
  );
}
