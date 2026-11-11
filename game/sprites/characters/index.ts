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
import { DOVA } from "./dova";
import { DOVA_PORTRAIT } from "./dova-portrait";
import { BRAM } from "./bram";
import { BRAM_PORTRAIT } from "./bram-portrait";
import { NERYS } from "./nerys";
import { NERYS_PORTRAIT } from "./nerys-portrait";
import { TOBIN } from "./tobin";
import { VALE } from "./vale";
import { VALE_PORTRAIT } from "./vale-portrait";
import { TOBIN_PORTRAIT } from "./tobin-portrait";
import { VOSS } from "./voss";
import { VOSS_PORTRAIT } from "./voss-portrait";
import { ILSA } from "./ilsa";
import { ILSA_PORTRAIT } from "./ilsa-portrait";
import { PERRIN } from "./perrin";
import { PERRIN_PORTRAIT } from "./perrin-portrait";
import { WREN } from "./wren";
import { WREN_PORTRAIT } from "./wren-portrait";
import { DAX } from "./dax";
import { DAX_PORTRAIT } from "./dax-portrait";
import { CORVO } from "./corvo";
import { CORVO_PORTRAIT } from "./corvo-portrait";

/** Overworld walkers: `walk-down`, `walk-up` and `walk-right` (mirror it for left), 4 frames each. */
export const WALKERS: readonly SpriteDef[] = [PLAYER, ADA, SABLE, ROOK, MARLOW, DOVA, BRAM, CORVO, NERYS, TOBIN, VALE, ILSA, PERRIN, VOSS, WREN, DAX];
/** 48×48 dialogue portraits with `idle` (blinks) and `talk`. */
export const PORTRAITS: readonly SpriteDef[] = [PLAYER_PORTRAIT, ADA_PORTRAIT, SABLE_PORTRAIT, ROOK_PORTRAIT, MARLOW_PORTRAIT, DOVA_PORTRAIT, BRAM_PORTRAIT, CORVO_PORTRAIT, NERYS_PORTRAIT, TOBIN_PORTRAIT, VALE_PORTRAIT, ILSA_PORTRAIT, PERRIN_PORTRAIT, VOSS_PORTRAIT, WREN_PORTRAIT, DAX_PORTRAIT];
export { WREN, WREN_PORTRAIT, DAX, DAX_PORTRAIT, VOSS, VOSS_PORTRAIT, ILSA, PERRIN, ILSA_PORTRAIT, PERRIN_PORTRAIT, VALE, VALE_PORTRAIT, PLAYER, ADA, SABLE, ROOK, MARLOW, DOVA, BRAM, CORVO, NERYS, TOBIN, NERYS_PORTRAIT, TOBIN_PORTRAIT, CORVO_PORTRAIT, DOVA_PORTRAIT, BRAM_PORTRAIT, PLAYER_PORTRAIT, ADA_PORTRAIT, SABLE_PORTRAIT, ROOK_PORTRAIT, MARLOW_PORTRAIT };
