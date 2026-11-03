import type { SpriteDef } from "../pixel";
import { PLAYER } from "./player";
import { PLAYER_PORTRAIT } from "./player-portrait";
import { ADA } from "./ada";
import { ADA_PORTRAIT } from "./ada-portrait";
import { SABLE } from "./sable";
import { SABLE_PORTRAIT } from "./sable-portrait";
import { ROOK } from "./rook";
import { ROOK_PORTRAIT } from "./rook-portrait";
import { MARLOW } from "./marlow";
import { MARLOW_PORTRAIT } from "./marlow-portrait";

/** Overworld walkers: `walk-down`, `walk-up` and `walk-right` (mirror it for left), 4 frames each. */
export const WALKERS: readonly SpriteDef[] = [PLAYER, ADA, SABLE, ROOK, MARLOW];
/** 48×48 dialogue portraits with `idle` (blinks) and `talk`. */
export const PORTRAITS: readonly SpriteDef[] = [PLAYER_PORTRAIT, ADA_PORTRAIT, SABLE_PORTRAIT, ROOK_PORTRAIT, MARLOW_PORTRAIT];
export { PLAYER, ADA, SABLE, ROOK, MARLOW, PLAYER_PORTRAIT, ADA_PORTRAIT, SABLE_PORTRAIT, ROOK_PORTRAIT, MARLOW_PORTRAIT };
