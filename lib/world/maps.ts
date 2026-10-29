import { HALL_LEGEND, OLD_TOWN_LEGEND } from "@/game/sprites/tiles/scenes";
import type { MapDef, MapTable } from "./world";

/**
 * Old Town square (the same layout as the art-review scene). Solid: roofs,
 * walls, windows, water, trees, lamps, hedges, benches, crates, flowerbeds,
 * boards, fences and the sign. The door (D) is a warp into the Drafting Hall.
 */
export const OLD_TOWN: MapDef = {
  id: "old-town",
  name: "Old Town",
  rows: [
    "gtgRRRRRRRRRRRRRRgtg",
    "gbgEEEEEEEEEEEEEEgbg",
    "gTgBWBBdBDBBdBBWBgTg",
    "ffgpppppppppppppppgf",
    "gSgpPPPPPPPPPPPPpggg",
    "ggLpPPPPwwwwPPPPpLgg",
    "ggMpPPPPwwwwPPPPpMgg",
    "ggfpPPPPPPPPPPPPpfgg",
    "gHHppppppppppppppHHg",
    "gNggZZZpppppZZZggXXg",
    "gfgfgFFFpppppFFFgfgG",
    "gGgQggggpppppggggQgg",
  ],
  solid: "tbTRBEWdLMSHNXFQZw",
  npcs: [],
  warps: [{ x: 9, y: 2, to: "drafting-hall", toX: 7, toY: 7, facing: "up" }],
  signs: { "1,4": "sign-welcome", "3,11": "board-quest", "17,11": "board-patterns" },
};

/** Ada Lintwell's Drafting Hall. The door mat (m) warps back to the square. */
export const DRAFTING_HALL: MapDef = {
  id: "drafting-hall",
  name: "Drafting Hall",
  rows: [
    "KKaWaacCaWaKKS",
    "KKalaaaaaaalKP",
    "fFfFfFfFfFfFfF",
    "f[]fnnnnnnf[]f",
    "FfFfw5555eFfFf",
    "f[]fw5555ef[]f",
    "FfFfsssssssFfF",
    "PfFfFfFfFfFfFP",
    "fFfFfFmmFfFfFf",
  ],
  solid: "KaWcClS[]P",
  npcs: [{ id: "ada", name: "Ada Lintwell", x: 3, y: 5, facing: "right", dialogue: "ada-intro" }],
  warps: [
    { x: 6, y: 8, to: "old-town", toX: 9, toY: 3, facing: "down" },
    { x: 7, y: 8, to: "old-town", toX: 9, toY: 3, facing: "down" },
  ],
  signs: { "6,1": "chalkboard-uml", "7,1": "chalkboard-uml" },
};

export const MAPS: MapTable = { [OLD_TOWN.id]: OLD_TOWN, [DRAFTING_HALL.id]: DRAFTING_HALL };

export const MAP_LEGENDS = { [OLD_TOWN.id]: OLD_TOWN_LEGEND, [DRAFTING_HALL.id]: HALL_LEGEND };

export const START = { map: "old-town", x: 9, y: 4, facing: "up" } as const;
