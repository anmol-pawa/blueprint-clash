import type { PartyState } from "../patterns/party";
import type { SaveData } from "./schema";

/** Replaces the party in a save. Call inside `updateSave`. */
export function setParty(d: SaveData, party: PartyState): void {
  d.party = structuredClone(party);
}
