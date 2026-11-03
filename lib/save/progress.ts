import type { SaveData } from "./schema";

/** Adds a district badge once (idempotent). Mutates `d`; call inside `updateSave`. */
export function awardBadge(d: SaveData, badge: string): void {
  if (!d.badges.includes(badge)) d.badges.push(badge);
}
