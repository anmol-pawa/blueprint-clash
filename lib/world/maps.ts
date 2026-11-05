import {
  BRIDGES_LEGEND,
  BRIDGES_ROWS,
  FOUNDRY_HALL_ROWS,
  FOUNDRY_LEGEND,
  FOUNDRY_ROWS,
  HALL_LEGEND,
  OLD_TOWN_LEGEND,
  PRINCIPLE_HALL_LEGEND,
  PRINCIPLE_HALL_ROWS,
  SOLID_SQUARE_LEGEND,
  SOLID_SQUARE_ROWS,
} from "@/game/sprites/tiles/scenes";
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
 * SOLID Square: a civic plaza with the Principle Hall to the north. The arch
 * door (two tiles) is a warp into the hall; the board and sign point at the
 * lessons. The road south returns to Old Town.
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
  warps: [
    ...[9, 10, 11].map((x) => ({ x, y: 13, to: "old-town", toX: 10, toY: 10, facing: "up" as const })),
    ...[9, 10].map((x) => ({ x, y: 2, to: "principle-hall", toX: x - 3, toY: 8, facing: "up" as const })),
    // the east gate leads to the Creational Foundry
    ...[3, 4].map((y) => ({ x: 19, y, to: "foundry", toX: 1, toY: y + 2, facing: "right" as const })),
  ],
  signs: { "1,4": "sign-solid-square", "17,9": "board-solid" },
};

/**
 * Provost Marlow's Principle Hall: a marble hall with a central carpet, two
 * statues of the scales and a bench each side. Marlow stands at the head of the
 * carpet; the carpet end (p, bottom row) warps back to the plaza.
 */
export const PRINCIPLE_HALL: MapDef = {
  id: "principle-hall",
  name: "Principle Hall",
  rows: PRINCIPLE_HALL_ROWS,
  solid: "WVKBUn",
  npcs: [{ id: "marlow", name: "Provost Isolde Marlow", x: 6, y: 3, facing: "down", dialogue: "marlow-intro" }],
  warps: [6, 7].map((x) => ({ x, y: 9, to: "solid-square", toX: x + 3, toY: 3, facing: "down" as const })),
  signs: {},
};

/**
 * Creational Foundry: a works front with furnaces and roller doors, a conveyor
 * of finished products and a molten channel (impassable) across the yard. The
 * west gate (two tiles) returns to SOLID Square. The middle roller door (two
 * tiles) is a warp into the Foundry Hall.
 */
export const FOUNDRY: MapDef = {
  id: "foundry",
  name: "Creational Foundry",
  rows: FOUNDRY_ROWS,
  solid: "RESsBWFDGeLMmvPaxoIH",
  npcs: [
    { id: "dova", name: "Dova Kiln", x: 9, y: 6, facing: "up", dialogue: "dova-intro" },
    { id: "bram", name: "Bram Cask", x: 14, y: 8, facing: "left", dialogue: "bram-intro" },
  ],
  warps: [
    ...[5, 6].map((y) => ({ x: 0, y, to: "solid-square", toX: 18, toY: y - 2, facing: "left" as const })),
    ...[9, 10].map((x) => ({ x, y: 2, to: "foundry-hall", toX: x - 3, toY: 8, facing: "up" as const })),
    // the east gate leads to the Structural Bridges
    ...[5, 6].map((y) => ({ x: 19, y, to: "bridges", toX: 1, toY: y - 2, facing: "right" as const })),
  ],
  signs: { "1,4": "sign-foundry" },
};

/**
 * Foreman Corvo's Foundry Hall: a brick works floor with a conveyor "carpet"
 * from the roller door to the Foreman's bay, an anvil and a furnace each side.
 * The conveyor end (bottom row) warps back to the yard.
 */
export const FOUNDRY_HALL: MapDef = {
  id: "foundry-hall",
  name: "Foundry Hall",
  rows: FOUNDRY_HALL_ROWS,
  solid: "BWGeFxa",
  npcs: [{ id: "corvo", name: "Foreman Corvo", x: 6, y: 3, facing: "down", dialogue: "corvo-intro" }],
  warps: [6, 7].map((x) => ({ x, y: 9, to: "foundry", toX: x + 3, toY: 3, facing: "down" as const })),
  signs: {},
};

/**
 * Structural Bridges: a harbour of warehouses (west bank), a tidal channel
 * crossed only by the plank bridge, a crane and boats. The west gate (two
 * tiles) returns to the Creational Foundry. The warehouse door is scenery until
 * the Bridges hall opens (C6e3).
 */
export const BRIDGES: MapDef = {
  id: "bridges",
  name: "Structural Bridges",
  rows: BRIDGES_ROWS,
  solid: "wpoeRERBWDlcrCKLMXOYTIF",
  npcs: [],
  warps: [3, 4].map((y) => ({ x: 0, y, to: "foundry", toX: 18, toY: y + 2, facing: "left" as const })),
  signs: { "18,4": "sign-bridges" },
};

export const MAPS: MapTable = { [OLD_TOWN.id]: OLD_TOWN, [DRAFTING_HALL.id]: DRAFTING_HALL, [SOLID_SQUARE.id]: SOLID_SQUARE, [PRINCIPLE_HALL.id]: PRINCIPLE_HALL, [FOUNDRY.id]: FOUNDRY, [FOUNDRY_HALL.id]: FOUNDRY_HALL, [BRIDGES.id]: BRIDGES };

export const MAP_LEGENDS = { [OLD_TOWN.id]: OLD_TOWN_LEGEND, [DRAFTING_HALL.id]: HALL_LEGEND, [SOLID_SQUARE.id]: SOLID_SQUARE_LEGEND, [PRINCIPLE_HALL.id]: PRINCIPLE_HALL_LEGEND, [FOUNDRY.id]: FOUNDRY_LEGEND, [FOUNDRY_HALL.id]: FOUNDRY_LEGEND, [BRIDGES.id]: BRIDGES_LEGEND };

export const START = { map: "old-town", x: 9, y: 4, facing: "up" } as const;
