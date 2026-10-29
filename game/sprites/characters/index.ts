import type { SpriteDef } from "../pixel";
import { PLAYER } from "./player";
import { PLAYER_PORTRAIT } from "./player-portrait";
import { ADA } from "./ada";
import { ADA_PORTRAIT } from "./ada-portrait";

/** Overworld walkers: `walk-down`, `walk-up` and `walk-right` (mirror it for left), 4 frames each. */
export const WALKERS: readonly SpriteDef[] = [PLAYER, ADA];
/** 48×48 dialogue portraits with `idle` (blinks) and `talk`. */
export const PORTRAITS: readonly SpriteDef[] = [PLAYER_PORTRAIT, ADA_PORTRAIT];
export { PLAYER, ADA, PLAYER_PORTRAIT, ADA_PORTRAIT };
