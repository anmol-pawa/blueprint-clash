import { DRAFTING_HALL_TILES } from "./drafting-hall";
import { FOUNDRY_TILES } from "./foundry";
import { OLD_TOWN_TILES } from "./old-town";
import { SOLID_SQUARE_TILES } from "./solid-square";
import type { TileSetDef } from "./tileset";

export const TILESETS: readonly TileSetDef[] = [OLD_TOWN_TILES, DRAFTING_HALL_TILES, SOLID_SQUARE_TILES, FOUNDRY_TILES];
export { FOUNDRY_TILES, OLD_TOWN_TILES, DRAFTING_HALL_TILES, SOLID_SQUARE_TILES };
export { OLD_TOWN_SCENE, DRAFTING_HALL_SCENE, SOLID_SQUARE_SCENE, PRINCIPLE_HALL_SCENE, FOUNDRY_SCENE, FOUNDRY_HALL_SCENE, FOUNDRY_HALL_ROWS, FOUNDRY_ROWS, FOUNDRY_LEGEND } from "./scenes";
