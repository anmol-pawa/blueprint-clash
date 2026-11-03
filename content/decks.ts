import type { Card } from "@/lib/battle/cards";
import type { BattleScene } from "@/lib/battle/scene";
import { OLD_TOWN_DECK } from "./cards/old-town";
import { SOLID_SQUARE_DECK } from "./cards/solid-square";

/** A district concept deck. Card ids are globally unique, so one SRS map serves every deck. */
export interface Deck {
  id: string;
  title: string;
  district: string;
  cards: Card[];
  /** Backdrop for this district's battles. */
  scene: BattleScene;
}

export const DECKS: readonly Deck[] = [
  { id: "old-town", title: "Old Town", district: "Foundations: classes, polymorphism, composition", cards: OLD_TOWN_DECK, scene: "old-town" },
  { id: "solid-square", title: "SOLID Square", district: "SRP, OCP, LSP, ISP, DIP and the supporting heuristics", cards: SOLID_SQUARE_DECK, scene: "solid-square" },
];

export const DEFAULT_DECK_ID = "old-town";

/** Looks a deck up by id; unknown or missing ids fall back to the default deck. */
export function getDeck(id: string | null | undefined): Deck {
  return DECKS.find((d) => d.id === id) ?? DECKS.find((d) => d.id === DEFAULT_DECK_ID)!;
}

/** Reads `?deck=` from a location search string such as `?deck=solid-square`. */
export function deckIdFromSearch(search: string): string {
  return getDeck(new URLSearchParams(search).get("deck")).id;
}
