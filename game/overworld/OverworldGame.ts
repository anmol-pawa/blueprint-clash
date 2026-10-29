import { Application, Container, Sprite, Texture } from "pixi.js";
import { MAPS, MAP_LEGENDS, START } from "@/lib/world/maps";
import { type Dir, type MapDef, type Npc, type PlayerState, DELTA, facingTarget, faceNpcToward, step } from "@/lib/world/world";
import { type DialogueState, advance, startDialogue } from "@/lib/dialogue/dialogue";
import { SCRIPTS } from "@/lib/dialogue/scripts";
import { ADA, PLAYER } from "@/game/sprites/characters";
import { animTextures, frameCanvas } from "@/game/sprites/texture";
import { DRAFTING_HALL_TILES, OLD_TOWN_TILES } from "@/game/sprites/tiles";
import type { SpriteDef } from "@/game/sprites/pixel";
import type { TileSetDef } from "@/game/sprites/tiles/tileset";

const TILE = 16;
/** Seconds to walk one tile. */
const STEP_SECONDS = 0.2;
const TILESET_FOR: Record<string, TileSetDef> = { "old-town": OLD_TOWN_TILES, "drafting-hall": DRAFTING_HALL_TILES };
const WALKER_FOR: Record<string, SpriteDef> = { ada: ADA };

export interface OverworldView {
  mapName: string;
  dialogue: DialogueState | null;
  /** Dialogue speaker id for portraits, "" when none. */
  speakerId: string;
}

type Walker = { container: Container; sprite: Sprite; def: SpriteDef };

/** Walker animation name and horizontal mirroring for a facing. */
function walkAnim(facing: Dir): { anim: string; mirror: boolean } {
  if (facing === "left") return { anim: "walk-right", mirror: true };
  return { anim: `walk-${facing}`, mirror: false };
}

/**
 * The Pixi overworld: draws the current map's tiles (animated tiles tick),
 * walks the player tile to tile, runs NPC/sign dialogue and warps between
 * maps. All rules live in lib/world and lib/dialogue; this class only
 * renders and routes input.
 */
export class OverworldGame {
  private app = new Application();
  private world = new Container();
  private tileTextures = new Map<string, Texture[]>();
  private animatedTiles: { sprite: Sprite; frames: Texture[]; fps: number }[] = [];
  private npcWalkers = new Map<string, Walker>();
  private player!: Walker;
  private state: PlayerState = { ...START };
  private flags: ReadonlySet<string> = new Set();
  private dialogue: DialogueState | null = null;
  private speakerId = "";
  private held: Dir | null = null;
  /** Walk tween: from/to in tiles, progress 0..1. */
  private walk: { fx: number; fy: number; tx: number; ty: number; t: number } | null = null;
  private pendingWarp: PlayerState | null = null;
  private clock = 0;
  private scale = 3;
  private destroyed = false;
  private map!: MapDef;

  constructor(private host: HTMLElement, private onView: (v: OverworldView) => void) {}

  async init(): Promise<void> {
    await this.app.init({ resizeTo: this.host, background: "#0a1530", antialias: false, roundPixels: true });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    this.host.appendChild(this.app.canvas);
    this.app.canvas.style.imageRendering = "pixelated";
    this.app.stage.addChild(this.world);
    this.loadMap(this.state.map);
    this.app.ticker.add((t) => this.update(t.deltaMS / 1000));
    this.emit();
  }

  destroy(): void {
    this.destroyed = true;
    if (this.app.renderer) this.app.destroy(true, { children: true });
  }

  /** Hold a direction (null to release). Ignored during dialogue. */
  setHeld(dir: Dir | null): void {
    this.held = dir;
  }

  /** The A button: advance dialogue, or interact with what the player faces. */
  interact(): void {
    if (this.dialogue) {
      this.dialogue = advance(this.dialogue);
      this.flags = this.dialogue.flags;
      if (this.dialogue.done) this.closeDialogue();
      else this.emit();
      return;
    }
    if (this.walk) return;
    const target = facingTarget(MAPS, this.state);
    if (!target) return;
    const scriptId = target.kind === "npc" ? target.npc.dialogue : target.dialogue;
    const script = SCRIPTS[scriptId];
    if (!script) return;
    if (target.kind === "npc") {
      const turned = faceNpcToward(target.npc, this.state);
      this.setNpcFacing(turned);
      this.speakerId = target.npc.id;
    } else this.speakerId = "";
    this.dialogue = startDialogue(script, this.flags);
    this.flags = this.dialogue.flags;
    this.emit();
  }

  choose(index: number): void {
    if (!this.dialogue) return;
    this.dialogue = advance(this.dialogue, index);
    this.flags = this.dialogue.flags;
    if (this.dialogue.done) this.closeDialogue();
    else this.emit();
  }

  private closeDialogue(): void {
    this.dialogue = null;
    this.speakerId = "";
    this.emit();
  }

  private emit(): void {
    this.onView({ mapName: this.map.name, dialogue: this.dialogue, speakerId: this.speakerId });
  }

  private texturesFor(set: TileSetDef, name: string): Texture[] {
    const key = `${set.id}/${name}`;
    let t = this.tileTextures.get(key);
    if (!t) {
      const frames = set.tiles[name];
      const def: SpriteDef = { id: key, name, w: set.size, h: set.size, palette: set.palette, anims: { idle: frames } };
      t = frames.map((f) => {
        const tex = Texture.from(frameCanvas(def, f));
        tex.source.scaleMode = "nearest";
        return tex;
      });
      this.tileTextures.set(key, t);
    }
    return t;
  }

  private loadMap(id: string): void {
    this.map = MAPS[id];
    const set = TILESET_FOR[id];
    const legend = MAP_LEGENDS[id];
    this.world.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.animatedTiles = [];
    this.npcWalkers.clear();
    const ground = new Container();
    this.world.addChild(ground);
    this.map.rows.forEach((row, ty) =>
      [...row].forEach((ch, tx) => {
        for (const name of legend[ch]) {
          const frames = this.texturesFor(set, name);
          const s = new Sprite(frames[0]);
          s.position.set(tx * TILE, ty * TILE);
          ground.addChild(s);
          if (frames.length > 1) this.animatedTiles.push({ sprite: s, frames, fps: set.fps?.[name] ?? 3 });
        }
      }),
    );
    const actors = new Container();
    actors.sortableChildren = true;
    this.world.addChild(actors);
    for (const npc of this.map.npcs) {
      const def = WALKER_FOR[npc.id];
      if (def) this.npcWalkers.set(npc.id, this.makeWalker(actors, def, npc.x, npc.y, npc.facing));
    }
    this.player = this.makeWalker(actors, PLAYER, this.state.x, this.state.y, this.state.facing);
    this.layoutCamera();
  }

  private makeWalker(parent: Container, def: SpriteDef, tx: number, ty: number, facing: Dir): Walker {
    const container = new Container();
    const sprite = new Sprite();
    sprite.anchor.set(0.5, 1);
    container.addChild(sprite);
    parent.addChild(container);
    const w: Walker = { container, sprite, def };
    this.place(w, tx, ty);
    this.pose(w, facing, false, 0);
    return w;
  }

  private place(w: Walker, tx: number, ty: number): void {
    w.container.position.set(tx * TILE + TILE / 2, (ty + 1) * TILE);
    w.container.zIndex = ty * TILE + TILE;
  }

  private pose(w: Walker, facing: Dir, moving: boolean, clock: number): void {
    const { anim, mirror } = walkAnim(facing);
    const frames = animTextures(w.def, anim);
    const fps = w.def.fps?.[anim] ?? 8;
    // standing still shows frame 0 of the walk cycle; the idle pose is the same silhouette
    w.sprite.texture = frames[moving ? Math.floor(clock * fps) % frames.length : 0];
    w.sprite.scale.x = mirror ? -1 : 1;
  }

  private setNpcFacing(npc: Npc): void {
    const w = this.npcWalkers.get(npc.id);
    if (w) this.pose(w, npc.facing, false, 0);
  }

  private layoutCamera(): void {
    this.cameraTo(this.playerTileX(), this.playerTileY());
  }

  private playerTileX(): number {
    return this.walk ? this.walk.fx + (this.walk.tx - this.walk.fx) * this.walk.t : this.state.x;
  }
  private playerTileY(): number {
    return this.walk ? this.walk.fy + (this.walk.ty - this.walk.fy) * this.walk.t : this.state.y;
  }

  /** Centre on the player, but never show past the map edge (or centre a map smaller than the view). */
  private cameraTo(tx: number, ty: number): void {
    const { width, height } = this.app.screen;
    this.scale = width >= 720 ? 3 : 2;
    this.world.scale.set(this.scale);
    const mapW = this.map.rows[0].length * TILE * this.scale;
    const mapH = this.map.rows.length * TILE * this.scale;
    const px = (tx + 0.5) * TILE * this.scale;
    const py = (ty + 0.5) * TILE * this.scale;
    const clamp = (view: number, map: number, p: number) => (map <= view ? Math.round((view - map) / 2) : Math.round(Math.min(0, Math.max(view - map, view / 2 - p))));
    this.world.position.set(clamp(width, mapW, px), clamp(height, mapH, py));
  }

  private update(dt: number): void {
    this.clock += dt;
    for (const a of this.animatedTiles) a.sprite.texture = a.frames[Math.floor(this.clock * a.fps) % a.frames.length];
    if (this.walk) {
      this.walk.t = Math.min(1, this.walk.t + dt / STEP_SECONDS);
      this.place(this.player, this.walk.fx + (this.walk.tx - this.walk.fx) * this.walk.t, this.walk.fy + (this.walk.ty - this.walk.fy) * this.walk.t);
      this.pose(this.player, this.state.facing, true, this.clock);
      if (this.walk.t >= 1) {
        this.walk = null;
        if (this.pendingWarp) this.finishWarp();
        else this.pose(this.player, this.state.facing, false, 0);
      }
    } else if (this.held && !this.dialogue) this.tryStep(this.held);
    this.cameraTo(this.playerTileX(), this.playerTileY());
  }

  private tryStep(dir: Dir): void {
    const r = step(MAPS, this.state, dir);
    if (r.kind === "moved" || r.kind === "turned") this.state = r.state;
    if (r.kind === "turned" || r.kind === "blocked") this.pose(this.player, this.state.facing, false, 0);
    if (r.kind === "moved") {
      const [dx, dy] = DELTA[dir];
      const fx = r.state.x - dx;
      const fy = r.state.y - dy;
      this.walk = { fx, fy, tx: r.state.x, ty: r.state.y, t: 0 };
    } else if (r.kind === "warped") {
      // walk one tile onto the door/mat, then swap maps
      const [dx, dy] = DELTA[dir];
      const prev = this.player.container;
      const fx = Math.round((prev.x - TILE / 2) / TILE);
      const fy = Math.round(prev.y / TILE) - 1;
      this.pendingWarp = r.state;
      this.walk = { fx, fy, tx: fx + dx, ty: fy + dy, t: 0 };
    }
  }

  private finishWarp(): void {
    if (!this.pendingWarp) return;
    this.state = this.pendingWarp;
    this.pendingWarp = null;
    this.loadMap(this.state.map);
    this.emit();
  }
}
