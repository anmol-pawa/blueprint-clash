import type { MasterDeck } from "@/lib/battle/master";
import { OLD_TOWN_MASTER, oldTownMasterDeck, type MasterProfile } from "./old-town";
import { SOLID_SQUARE_MASTER, solidSquareMasterDeck } from "./solid-square";
import { CREATIONAL_FOUNDRY_MASTER, creationalFoundryMasterDeck } from "./creational-foundry";

export type { MasterProfile };

export interface MasterEntry {
  profile: MasterProfile;
  deck: () => MasterDeck;
  /** Visual and audio choices live here by id so content stays free of game imports. */
  visual: "warden-vane" | "provost-marlow" | "foreman-corvo";
}

/** Keyed by the `?master=` query value (the district id). */
export const MASTERS: Record<string, MasterEntry> = {
  "old-town": { profile: OLD_TOWN_MASTER, deck: oldTownMasterDeck, visual: "warden-vane" },
  "solid-square": { profile: SOLID_SQUARE_MASTER, deck: solidSquareMasterDeck, visual: "provost-marlow" },
  "creational-foundry": { profile: CREATIONAL_FOUNDRY_MASTER, deck: creationalFoundryMasterDeck, visual: "foreman-corvo" },
};

export const DEFAULT_MASTER = "old-town";
export const masterIdFromSearch = (search: string): string => {
  const id = new URLSearchParams(search).get("master") ?? DEFAULT_MASTER;
  return id in MASTERS ? id : DEFAULT_MASTER;
};
