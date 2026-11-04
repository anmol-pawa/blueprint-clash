import type { MasterDeck } from "@/lib/battle/master";
import { OLD_TOWN_MASTER, oldTownMasterDeck, type MasterProfile } from "./old-town";
import { SOLID_SQUARE_MASTER, solidSquareMasterDeck } from "./solid-square";

export type { MasterProfile };

export interface MasterEntry {
  profile: MasterProfile;
  deck: () => MasterDeck;
  /** Visual and audio choices live here by id so content stays free of game imports. */
  visual: "warden-vane" | "provost-marlow";
}

/** Keyed by the `?master=` query value (the district id). */
export const MASTERS: Record<string, MasterEntry> = {
  "old-town": { profile: OLD_TOWN_MASTER, deck: oldTownMasterDeck, visual: "warden-vane" },
  "solid-square": { profile: SOLID_SQUARE_MASTER, deck: solidSquareMasterDeck, visual: "provost-marlow" },
};

export const DEFAULT_MASTER = "old-town";
export const masterIdFromSearch = (search: string): string => {
  const id = new URLSearchParams(search).get("master") ?? DEFAULT_MASTER;
  return id in MASTERS ? id : DEFAULT_MASTER;
};
