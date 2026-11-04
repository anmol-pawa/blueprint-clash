import type { SpriteDef } from "./pixel";
import { DRAFTLING } from "./creatures/draftling";
import { DRAFTLING_BACK } from "./creatures/draftling-back";
import { ARCHITECT } from "./creatures/architect";
import { ARCHITECT_BACK } from "./creatures/architect-back";
import { WARDEN_VANE } from "./creatures/warden-vane";
import { PROVOST_MARLOW } from "./creatures/provost-marlow";
import { FOREMAN_CORVO } from "./creatures/foreman-corvo";
import { ROUGH_DRAFT } from "./creatures/rough-draft";
import { FORGEBOT } from "./creatures/forgebot";
import { BEAVERBUILD } from "./creatures/beaverbuild";
import { SOLO } from "./creatures/solo";
import { CLONEWISP } from "./creatures/clonewisp";

/** Every creature sprite, in review order (shown on /dev/sprites). */
export const SPRITES: readonly SpriteDef[] = [DRAFTLING, DRAFTLING_BACK, ARCHITECT, ARCHITECT_BACK, ROUGH_DRAFT, FORGEBOT, BEAVERBUILD, SOLO, CLONEWISP, WARDEN_VANE, PROVOST_MARLOW, FOREMAN_CORVO];
