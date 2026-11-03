import { HALL_LEGEND, OLD_TOWN_LEGEND, SOLID_SQUARE_LEGEND, SOLID_SQUARE_ROWS } from "@/game/sprites/tiles/scenes";
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
  warps: [
    { x: 9, y: 2, to: "drafting-hall", toX: 7, toY: 7, facing: "up" },
    // the cobbled road south leads to SOLID Square
    ...[9, 10, 11].map((x) => ({ x, y: 11, to: "solid-square", toX: 10, toY: 12, facing: "up" as const })),
  ],
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

/**
 * SOLID Square: a civic plaza with the Principle Hall to the north. Its arch
 * door is shut until the district master's gym arrives (C4e3); the board and
 * sign point at the lessons. The road south returns to Old Town.
 */
export const SOLID_SQUARE: MapDef = {
  id: "solid-square",
  name: "SOLID Square",
  rows: SOLID_SQUARE_ROWS,
  solid: "tbTCEWVKBA1234LMHNUFQI",
  npcs: [
    { id: "sable", name: "Sable Quill", x: 5, y: 6, facing: "right", dialogue: "sable-intro" },
    { id: "rook", name: "Rook Ferris", x: 14, y: 8, facing: "left", dialogue: "rook-intro" },
  ],
  warps: [9, 10, 11].map((x) => ({ x, y: 13, to: "old-town", toX: 10, toY: 10, facing: "up" as const })),
  signs: { "1,4": "sign-solid-square", "17,9": "board-solid", "9,2": "door-principle-hall", "10,2": "door-principle-hall" },
};

export const MAPS: MapTable = { [OLD_TOWN.id]: OLD_TOWN, [DRAFTING_HALL.id]: DRAFTING_HALL, [SOLID_SQUARE.id]: SOLID_SQUARE };

export const MAP_LEGENDS = { [OLD_TOWN.id]: OLD_TOWN_LEGEND, [DRAFTING_HALL.id]: HALL_LEGEND, [SOLID_SQUARE.id]: SOLID_SQUARE_LEGEND };

export const START = { map: "old-town", x: 9, y: 4, facing: "up" } as const;
