import type { SpriteDef } from "./pixel";
import { DRAFTLING } from "./creatures/draftling";
import { DRAFTLING_BACK } from "./creatures/draftling-back";
import { ARCHITECT } from "./creatures/architect";
import { ARCHITECT_BACK } from "./creatures/architect-back";
import { WARDEN_VANE } from "./creatures/warden-vane";
import { PROVOST_MARLOW } from "./creatures/provost-marlow";
import { FOREMAN_CORVO } from "./creatures/foreman-corvo";
import { HARBOURMASTER_VALE } from "./creatures/harbourmaster-vale";
import { ROUGH_DRAFT } from "./creatures/rough-draft";
import { FORGEBOT } from "./creatures/forgebot";
import { BEAVERBUILD } from "./creatures/beaverbuild";
import { SOLO } from "./creatures/solo";
import { CLONEWISP } from "./creatures/clonewisp";
import { AXOLINK } from "./creatures/axolink";
import { BRIDGEBACK } from "./creatures/bridgeback";
import { FRACTREE } from "./creatures/fractree";
import { SHELLCRAB } from "./creatures/shellcrab";
import { FACADEON } from "./creatures/facadeon";
import { FLYTILE } from "./creatures/flytile";
import { PROXIFOX } from "./creatures/proxifox";
import { CHAMELSTRAT } from "./creatures/chamelstrat";
import { OWLSERVER } from "./creatures/owlserver";
import { COMMANDANT } from "./creatures/commandant";

/** Every creature sprite, in review order (shown on /dev/sprites). */
export const SPRITES: readonly SpriteDef[] = [DRAFTLING, DRAFTLING_BACK, ARCHITECT, ARCHITECT_BACK, ROUGH_DRAFT, FORGEBOT, BEAVERBUILD, SOLO, CLONEWISP, AXOLINK, BRIDGEBACK, FRACTREE, SHELLCRAB, FACADEON, FLYTILE, PROXIFOX, CHAMELSTRAT, OWLSERVER, COMMANDANT, WARDEN_VANE, PROVOST_MARLOW, FOREMAN_CORVO, HARBOURMASTER_VALE];
