import type { SpriteDef } from "./pixel";
import { DRAFTLING } from "./creatures/draftling";
import { DRAFTLING_BACK } from "./creatures/draftling-back";

/** Every pixel sprite in the game, shown in /dev/sprites and checked by tests. */
export const SPRITES: readonly SpriteDef[] = [DRAFTLING, DRAFTLING_BACK];

export function spriteById(id: string): SpriteDef | undefined {
  return SPRITES.find((s) => s.id === id);
}
