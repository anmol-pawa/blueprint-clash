import type { Card } from "@/lib/battle/cards";
import type { BattleScene } from "@/lib/battle/scene";
import { OLD_TOWN_DECK } from "./cards/old-town";
import { SOLID_SQUARE_DECK } from "./cards/solid-square";
import { CREATIONAL_FOUNDRY_DECK } from "./cards/creational-foundry";
import { STRUCTURAL_BRIDGES_DECK } from "./cards/structural-bridges";
import { BEHAVIOURAL_THEATRE_DECK } from "./cards/behavioural-theatre";

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
  // The Creational Foundry has no backdrop of its own yet; it borrows the marble hall until C5 art lands.
  { id: "creational-foundry", title: "Creational Foundry", district: "Factory Method, Abstract Factory, Builder, Prototype, Singleton, pools and DI", cards: CREATIONAL_FOUNDRY_DECK, scene: "foundry" },
  // The Structural Bridges have no backdrop of their own yet (C6d); the deck borrows the marble hall.
  { id: "structural-bridges", title: "Structural Bridges", district: "Adapter, Bridge, Composite, Decorator, Facade, Flyweight and Proxy", cards: STRUCTURAL_BRIDGES_DECK, scene: "bridges" },
  // Behavioural Theatre borrows the Bridges backdrop until its own scene lands (C7d).
  { id: "behavioural-theatre", title: "Behavioural Theatre", district: "Strategy to Iterator, Chain, Mediator, Memento, Visitor, Interpreter, Null Object and Specification", cards: BEHAVIOURAL_THEATRE_DECK, scene: "theatre" },
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
