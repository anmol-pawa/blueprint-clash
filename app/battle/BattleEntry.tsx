"use client";
import { useSyncExternalStore } from "react";
import { deckIdFromSearch } from "@/content/decks";
import { BattleClient } from "./BattleClient";

const subscribe = () => () => {};
const clientDeck = () => deckIdFromSearch(window.location.search);
const serverDeck = () => null;

/** Reads `?deck=` on the client (the page is statically exported), then starts the battle with that deck. */
export function BattleEntry() {
  const deckId = useSyncExternalStore(subscribe, clientDeck, serverDeck);
  if (deckId === null) return <main className="fixed inset-0 bg-[var(--bg)]" />;
  return <BattleClient deckId={deckId} />;
}
