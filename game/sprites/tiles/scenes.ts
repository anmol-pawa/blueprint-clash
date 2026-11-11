import { BRIDGES_TILES } from "./bridges";
import { DRAFTING_HALL_TILES } from "./drafting-hall";
import { FOUNDRY_TILES } from "./foundry";
import { THEATRE_TILES } from "./theatre";
import { DOCKS_TILES } from "./docks";
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

/** Foundry Hall rows, shared by the scene and the map: a conveyor runs from the roller door to the Foreman's bay. */
export const FOUNDRY_HALL_ROWS: readonly string[] = [
  "BWBBeBBBBeBBWB",
  "GFBGBBBBBBGBFG",
  "ppppppvvpppppp",
  "pappppvvppppap",
  "ppppppvvpppppp",
  "pxppppvvppppxp",
  "ppppppvvpppppp",
  "ppppppvvpppppp",
  "ppppppvvpppppp",
  "ppppppvvpppppp",
];

/** The Foundry Hall interior for art review. */
export const FOUNDRY_HALL_SCENE = composeScene(FOUNDRY_TILES, "foundry-hall-scene", FOUNDRY_HALL_ROWS, FOUNDRY_LEGEND);

export const BRIDGES_LEGEND: Legend = {
  q: ["quay"], Q: ["quay-2"], w: ["water"], e: ["quay-edge"], p: ["piles"], o: ["boat"],
  R: ["roof-teal"], E: ["roof-eave"], B: ["warehouse-wall"], W: ["window"], D: ["door"],
  N: ["bridge-deck", "rail-n"], S: ["bridge-deck", "rail-s"], d: ["bridge-deck"], l: ["arch-left"], c: ["arch-crown"], r: ["arch-right"],
  C: ["quay", "crane-top"], K: ["quay", "crane-base"], L: ["quay", "lamp-top"], M: ["quay", "lamp-base"],
  X: ["quay", "crate"], O: ["quay", "barrel"], Y: ["quay", "bollard"], T: ["quay", "ropes"], I: ["quay", "sign"], F: ["quay", "flag"],
};

/** Structural Bridges rows, shared by the scene and the map: a warehouse bank, a channel crossed by a plank bridge, a crane, a harbour arcade. */
export const BRIDGES_ROWS: readonly string[] = [
  "qRRRRRRqwwwwqqQqqqqq",
  "qEEEEEEqwwwwqqqqCqqq",
  "qBWBDBWqwwwwqqqqKqqq",
  "qqqqqqqqwwwwqLqqqqqq",
  "qqFXOqqqwwwwqMqqYqIq",
  "qqqqqqqqNNNNqqqqqqqq",
  "qqqqqqqqSSSSqqqqqqqq",
  "qqTqqQqqwpwpqqqXqqqq",
  "eeeeeeeewwwweeeeeeee",
  "wwwwwwwwwwwwwwwwwwww",
  "wwowwwwwwwwwwwwwowww",
  "lcrlcrlcrlcrlcrlcrlc",
];

/** A sample of the Structural Bridges harbour for art review: warehouses, a plank bridge over a tidal channel, a crane, boats, an arcade. */
/** Bridges Hall rows: a plank floor with a stone runner from the door to the Harbourmaster's berth. */
export const BRIDGES_HALL_ROWS: readonly string[] = [
  "BWBBBWBBWBBBWB",
  "BBBBFBBBBBBBBB",
  "ddddddqqdddddd",
  "dXdddqqqqdddOd",
  "ddddddqqdddddd",
  "dTdddddddddddd",
  "ddddddqqdddddd",
  "dOdddddddddXdd",
  "ddddddqqdddddd",
  "ddddddqqdddddd",
];

export const BRIDGES_SCENE = composeScene(BRIDGES_TILES, "bridges-scene", BRIDGES_ROWS, BRIDGES_LEGEND);

/** The Bridges Hall interior for art review. */
export const BRIDGES_HALL_SCENE = composeScene(BRIDGES_TILES, "bridges-hall-scene", BRIDGES_HALL_ROWS, BRIDGES_LEGEND);

export const THEATRE_LEGEND: Legend = {
  q: ["plaza"], Q: ["plaza-2"], f: ["stage-floor"], m: ["stage-mark"], r: ["carpet"], R: ["carpet-2"], u: ["footlights"],
  S: ["roof-slate"], E: ["roof-eave"], B: ["theatre-wall"], W: ["window"], D: ["door"], K: ["marquee"],
  l: ["curtain-left"], c: ["curtain-mid"], t: ["curtain-right"], P: ["pelmet"],
  C: ["plaza", "column-top"], V: ["plaza", "column-base"], H: ["stage-floor", "spotlight"], A: ["carpet", "seats"],
  X: ["plaza", "poster"], T: ["plaza", "booth-top"], U: ["plaza", "booth-front"], Z: ["plaza", "trunk"], I: ["plaza", "sign"],
  L: ["plaza", "lamp-top"], M: ["plaza", "lamp-base"], F: ["plaza", "bunting"], G: ["plaza", "laurel"],
  // Hall interior: props standing on stage boards.
  z: ["stage-floor", "trunk"], x: ["stage-floor", "poster"], h: ["stage-floor", "sign"],
};

/** Behavioural Theatre rows, shared by the scene and the map: a playhouse front with marquee, a ticket booth, a plaza, and a stage behind a curtain. */
export const THEATRE_ROWS: readonly string[] = [
  "SSSSSSSSSSSSSSSSSSSS",
  "EEEEEEEEEEEEEEEEEEEE",
  "BWBWBBKKKBBWBWBBBBBB",
  "BBBBBBBDBBBBBBBBBBBB",
  "qFqqqqGqGqqqqLqqTqIq",
  "qqXqqqqqqqqqqMqqUqqq",
  "qqqqqqqqqqqqqqqqqqqq",
  "PPPPPPPPPPPPPPPPPPPP",
  "lcccctlcccctlcccctlc",
  "ffffffffmffffffffHff",
  "ffffffffffffffffffff",
  "uuuuuuuuuuuuuuuuuuuu",
  "rrRrrAArrRrrAArrRrrr",
];

/** A sample of the Behavioural Theatre for art review: a marquee playhouse, a plaza, and a curtained stage with footlights. */
export const THEATRE_SCENE = composeScene(THEATRE_TILES, "theatre-scene", THEATRE_ROWS, THEATRE_LEGEND);

/** Theatre Hall rows: a stage-board floor with a red carpet runner from the door to Director Voss's spotlight. */
export const THEATRE_HALL_ROWS: readonly string[] = [
  "BWBBBWBBWBBBWB",
  "BBBBhBBBBBBBBB",
  "ffffffHHffffff",
  "fzfffrRrRfffxf",
  "ffffffrRffffff",
  "fxffffrRffffff",
  "ffffffrRffffff",
  "fzffffRrfffzff",
  "ffffffrRffffff",
  "ffffffrRffffff",
];

/** The Theatre Hall interior for art review. */
export const THEATRE_HALL_SCENE = composeScene(THEATRE_TILES, "theatre-hall-scene", THEATRE_HALL_ROWS, THEATRE_LEGEND);

export const DOCKS_LEGEND: Legend = {
  q: ["quay"], Q: ["quay-2"], p: ["pier"], P: ["pier-2"], w: ["water"], e: ["quay-edge"],
  S: ["roof-slate"], E: ["roof-eave"], B: ["brick-wall"], W: ["shutter"], D: ["cargo-door"],
  c: ["quay", "crate"], k: ["quay", "crate-locked"], b: ["quay", "barrel"], o: ["quay", "bollard"], r: ["quay", "rope"],
  T: ["quay", "crane-top"], U: ["quay", "crane-base"], L: ["quay", "lantern-top"], M: ["quay", "lantern-base"],
  N: ["brick-wall", "net"], I: ["quay", "sign-board"], x: ["pier", "crate-locked"], y: ["pier", "barrel"], z: ["water", "boat"],
};

/** Concurrency Docks rows, shared by the scene and the map: a warehouse front with a padlocked cargo door, a quay with crates and a crane, piers into the harbour. */
export const DOCKS_ROWS: readonly string[] = [
  "SSSSSSSSSSSSSSSSSSSS",
  "EEEEEEEEEEEEEEEEEEEE",
  "BWBWBBNBBBWBWBBNBBWB",
  "BBBBBBBBDBBBBBBBBBBB",
  "qLqcqbqqqqqqkqqqTqIq",
  "qMqkqqrqQqqoqbqqUqqq",
  "qqqqqqqqqqqqqqqqqqqq",
  "eeeeeeeeeeeeeeeeeeee",
  "wwwwwppppwwwwwppppww",
  "wwzwwppxpwwwwwppyppw",
  "wwwwwppppwwwwwppppww",
  "wwwwwppppwzwwwppppww",
  "wwwwwwwwwwwwwwwwwwww",
];

/** The Concurrency Docks for art review: warehouse, quay, crane and piers over animated water. */
export const DOCKS_SCENE = composeScene(DOCKS_TILES, "docks-scene", DOCKS_ROWS, DOCKS_LEGEND);
