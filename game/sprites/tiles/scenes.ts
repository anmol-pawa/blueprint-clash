import { DRAFTING_HALL_TILES } from "./drafting-hall";
import { OLD_TOWN_TILES } from "./old-town";
import { type Legend, composeScene } from "./tileset";

const OLD_TOWN_LEGEND: Legend = {
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

const HALL_LEGEND: Legend = {
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
