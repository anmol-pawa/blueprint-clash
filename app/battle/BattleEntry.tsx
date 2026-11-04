"use client";
import { useSyncExternalStore } from "react";
import { deckIdFromSearch } from "@/content/decks";
import { getTrainer } from "@/content/trainers";
import { BattleClient } from "./BattleClient";

const subscribe = () => () => {};
const clientKey = () => window.location.search;
const serverKey = () => null;

/** Reads `?deck=` on the client (the page is statically exported), then starts the battle with that deck (or a trainer duel from `?trainer=`). */
export function BattleEntry() {
  const search = useSyncExternalStore(subscribe, clientKey, serverKey);
  if (search === null) return <main className="fixed inset-0 bg-[var(--bg)]" />;
  const trainer = getTrainer(new URLSearchParams(search).get("trainer"));
  return <BattleClient deckId={trainer ? trainer.deckId : deckIdFromSearch(search)} trainerId={trainer?.id} />;
}
