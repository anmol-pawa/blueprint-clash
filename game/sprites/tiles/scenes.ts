import { DRAFTING_HALL_TILES } from "./drafting-hall";
import { FOUNDRY_TILES } from "./foundry";
import { OLD_TOWN_TILES } from "./old-town";
import { SOLID_SQUARE_TILES } from "./solid-square";
import { type Legend, composeScene } from "./tileset";

export const OLD_TOWN_LEGEND: Legend = {
  g: ["grass"], G: ["grass-2"], f: ["grass-flowers"], p: ["path"], P: ["plaza"], w: ["water"],
  R: ["roof-slate"], E: ["roof-eave"], B: ["brick-wall"], W: ["window"], D: ["door"], d: ["window-dark"],
  t: ["grass", "tree-canopy-top"], b: ["grass", "tree-canopy-bottom"], T: ["grass", "tree-trunk"],
  L: ["path", "lamp-top"], M: ["path", "lamp-base"], S: ["grass", "sign"], H: ["grass", "hedge"],
  N: ["grass", "bench"], X: ["grass", "crate"], F: ["grass", "flowerbed"], Q: ["grass", "board"], Z: ["grass", "fence"],
};

/** A sample of Old Town square for art review: the Drafting Hall front, a plaza with a pond, lamps, trees. */
export const OLD_TOWN_SCENE = composeScene(
  OLD_TOWN_TILES,
  "old-town-scene",
  [
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
  OLD_TOWN_LEGEND,
);

export const HALL_LEGEND: Legend = {
  a: ["wall-panel"], W: ["hall-window"], K: ["bookshelf"], c: ["chalkboard-l"], C: ["chalkboard-r"], l: ["wall-lamp"],
  f: ["floor-wood"], F: ["floor-wood-2"], "5": ["rug-center"], n: ["rug-n"], s: ["rug-s"], w: ["rug-w"], e: ["rug-e"],
  "[": ["table-l"], "]": ["table-r"], P: ["plant"], m: ["door-mat"], S: ["stairs"],
};

/** The Drafting Hall interior: Ada's hub with drafting tables, a chalkboard, bookshelves and a rug. */
export const DRAFTING_HALL_SCENE = composeScene(
  DRAFTING_HALL_TILES,
  "drafting-hall-scene",
  [
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
  HALL_LEGEND,
);

export const SOLID_SQUARE_LEGEND: Legend = {
  g: ["grass"], G: ["grass-2"], f: ["grass-flowers"], p: ["path"], P: ["plaza"],
  "1": ["basin-tl"], "2": ["basin-tr"], "3": ["basin-bl"], "4": ["basin-br"],
  C: ["roof-copper"], E: ["roof-eave"], W: ["stone-wall"], V: ["window"], K: ["column"], B: ["banner"], A: ["arch-door"],
  t: ["grass", "tree-canopy-top"], b: ["grass", "tree-canopy-bottom"], T: ["grass", "tree-trunk"],
  L: ["path", "lamp-top"], M: ["path", "lamp-base"], I: ["grass", "sign"], H: ["grass", "topiary"],
  N: ["grass", "bench"], U: ["plaza", "statue"], F: ["grass", "flowerbed"], Q: ["grass", "board"],
};

/** SOLID Square rows, shared by the scene and the map. */
export const SOLID_SQUARE_ROWS: readonly string[] = [
  "gtgCCCCCCCCCCCCCCgtg",
  "gbgEEEEEEEEEEEEEEgbg",
  "gTgKVBKWKAAKWKBVKgTg",
  "gfgppppppppppppppgfg",
  "gIgpPPPPPPPPPPPPpggg",
  "ggLpPPPPP12PPPPPpLgg",
  "ggMpPPPPP34PPPPPpMgg",
  "ggfpPUPPPPPPPPUPpfgg",
  "gHHppppppppppppppHHg",
  "gNggggggpppppggggQgg",
  "gtgFFFgGpppppGgFFFgt",
  "gbgggggfpppppfggggbg",
  "gTggggggpppppgggggTg",
  "gGgggggfpppppfgggGgg",
];

/** A sample of SOLID Square for art review: the Principle Hall, the fountain plaza, statues and lamps. */
export const SOLID_SQUARE_SCENE = composeScene(SOLID_SQUARE_TILES, "solid-square-scene", SOLID_SQUARE_ROWS, SOLID_SQUARE_LEGEND);

export const PRINCIPLE_HALL_LEGEND: Legend = {
  P: ["plaza"], p: ["path"], W: ["stone-wall"], V: ["window"], K: ["column"], B: ["banner"],
  U: ["plaza", "statue"], n: ["plaza", "bench"],
};

/** Principle Hall rows, shared by the scene and the map: a carpet runs from the door mat to the Provost's dais. */
export const PRINCIPLE_HALL_ROWS: readonly string[] = [
  "WVWWBWWWWBWWVW",
  "KWWKWWWWWWKWWK",
  "PPPPPPppPPPPPP",
  "PUPPPPppPPPPUP",
  "PPPPPPppPPPPPP",
  "PnPPPPppPPPPnP",
  "PPPPPPppPPPPPP",
  "PPPPPPppPPPPPP",
  "PPPPPPppPPPPPP",
  "PPPPPPppPPPPPP",
];

/** The Principle Hall interior for art review. */
export const PRINCIPLE_HALL_SCENE = composeScene(SOLID_SQUARE_TILES, "principle-hall-scene", PRINCIPLE_HALL_ROWS, PRINCIPLE_HALL_LEGEND);

export const FOUNDRY_LEGEND: Legend = {
  c: ["cinder"], C: ["cinder-2"], p: ["plate"], v: ["conveyor"], m: ["molten-channel"],
  R: ["roof-sawtooth"], E: ["roof-eave"], S: ["roof-sawtooth", "smokestack-top"], s: ["roof-eave", "smokestack-base"],
  B: ["brick-wall"], W: ["window"], F: ["furnace"], D: ["roller-door"], G: ["girder"], e: ["brick-wall", "gear"],
  a: ["cinder", "anvil"], x: ["cinder", "crate"], o: ["cinder", "barrel"], I: ["cinder", "sign"],
  L: ["plate", "lamp-top"], M: ["plate", "lamp-base"], P: ["conveyor", "pallet"], H: ["cinder", "pipe"],
};

/** Creational Foundry rows, shared by the scene and the map: the works front, a conveyor of products, a molten channel. */
export const FOUNDRY_ROWS: readonly string[] = [
  "ccRRSRRRRRRRRRRSRRcc",
  "ccEEsEEEEEEEEEEsEEcc",
  "cGBWBeBFBDDBFBeBWBGc",
  "ccppppppppppppppppcc",
  "cIpLpppppppppppppLpc",
  "ccpMpvvPvvvvvPvvvMpc",
  "ccppppppppppppppppcc",
  "cmmmmmmmmmmmmmmmmmmc",
  "ccppoppxxppppppappcc",
  "CcccccccCcccccccCccc",
  "cccxcccccHHHHcccocCc",
  "cCcccccCcccccccccccc",
];

/** A sample of the Creational Foundry for art review: furnaces, smokestacks, a conveyor of finished products, molten metal. */
export const FOUNDRY_SCENE = composeScene(FOUNDRY_TILES, "foundry-scene", FOUNDRY_ROWS, FOUNDRY_LEGEND);
