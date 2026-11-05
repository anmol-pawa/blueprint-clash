import { sfx } from "@/game/audio/synth";
import { Application, Container, Graphics, Text } from "pixi.js";
import { PixelSprite } from "@/game/sprites/texture";
import type { SpriteDef } from "@/game/sprites/pixel";
import type { BattleScene } from "@/lib/battle/scene";

/** Logical stage size; the container is scaled to fit the host. */
export const STAGE_W = 256;
export const STAGE_H = 144;

const PLAYER_HOME = { x: 66, y: 134 };
const FOE_HOME = { x: 188, y: 88 };

type Tween = { t: number; dur: number; fn: (k: number) => void; done: () => void };

const ease = (k: number) => 1 - (1 - k) * (1 - k);

/**
 * The battle scene: an Old Town dusk backdrop, two platforms, the player's
 * creature (back view) and the foe (front view). The React UI decides what
 * happens; this class only animates it (lunge, hurt flash, shake, hit-stop,
 * damage numbers, faint, intro slide-in).
 */
export class BattleStage {
  private app = new Application();
  private root = new Container();
  private fx = new Container();
  private player!: PixelSprite;
  private foe!: PixelSprite;
  private tweens: Tween[] = [];
  private frozen = 0;
  private shake = 0;
  private fade!: Graphics;
  private destroyed = false;

  constructor(
    private host: HTMLElement,
    private playerDef: SpriteDef,
    private foeDef: SpriteDef,
    private scene: BattleScene = "old-town",
  ) {}

  async init(): Promise<void> {
    await this.app.init({ resizeTo: this.host, background: "#0a1530", antialias: false, roundPixels: true });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    this.host.appendChild(this.app.canvas);
    this.app.canvas.style.imageRendering = "pixelated";
    this.app.stage.addChild(this.root);
    this.root.addChild(this.scene === "solid-square" ? this.solidSquareBackdrop() : this.scene === "foundry" ? this.foundryBackdrop() : this.scene === "bridges" ? this.bridgesBackdrop() : this.backdrop());
    this.foe = new PixelSprite(this.foeDef, 1);
    this.player = new PixelSprite(this.playerDef, 1);
    this.foe.position.set(FOE_HOME.x + 140, FOE_HOME.y);
    this.player.position.set(PLAYER_HOME.x - 140, PLAYER_HOME.y);
    this.root.addChild(this.foe, this.player, this.fx);
    this.fade = new Graphics().rect(0, 0, STAGE_W, STAGE_H).fill(0x000000);
    this.root.addChild(this.fade);
    this.app.ticker.add((t) => this.update(t.deltaMS / 1000));
    this.app.renderer.on("resize", () => this.layout());
    this.layout();
  }

  destroy(): void {
    this.destroyed = true;
    if (this.app.renderer) this.app.destroy(true, { children: true });
  }

  private layout(): void {
    const { width, height } = this.app.screen;
    const s = Math.min(width / STAGE_W, height / STAGE_H);
    this.root.scale.set(s);
    this.baseX = (width - STAGE_W * s) / 2;
    this.baseY = (height - STAGE_H * s) / 2;
    this.root.position.set(this.baseX, this.baseY);
  }
  private baseX = 0;
  private baseY = 0;

  private backdrop(): Container {
    const c = new Container();
    const g = new Graphics();
    // dusk sky in four flat bands
    const bands = [0x142a5e, 0x23407f, 0x3f5f9c, 0x7a8fb8];
    bands.forEach((col, i) => g.rect(0, i * 24, STAGE_W, 24).fill(col));
    g.circle(214, 22, 9).fill(0xfde9a8).circle(218, 20, 8).fill(0x23407f); // crescent moon
    // skyline
    const buildings: [number, number, number][] = [[0, 70, 26], [26, 56, 22], [48, 76, 30], [78, 62, 24], [102, 82, 20], [122, 58, 28], [150, 72, 22], [172, 52, 26], [198, 68, 30], [228, 60, 28]];
    for (const [x, top, w] of buildings) {
      g.rect(x, top, w, 96 - top).fill(0x1c3158);
      g.rect(x, top, w, 3).fill(0x2b4676);
      for (let wy = top + 8; wy < 90; wy += 10) for (let wx = x + 4; wx < x + w - 4; wx += 8) g.rect(wx, wy, 3, 4).fill((wx * 7 + wy * 3) % 5 === 0 ? 0xf5d36a : 0x2b4676);
    }
    // ground: cobbles
    g.rect(0, 96, STAGE_W, STAGE_H - 96).fill(0x5a4a3c);
    for (let y = 96; y < STAGE_H; y += 8) {
      g.rect(0, y, STAGE_W, 1).fill(0x463a30);
      for (let x = ((y / 8) % 2) * 8; x < STAGE_W; x += 16) g.rect(x, y, 1, 8).fill(0x463a30);
    }
    g.rect(0, 96, STAGE_W, 2).fill(0x7a6650);
    // platforms
    const platform = (x: number, y: number, rx: number, ry: number) => {
      g.ellipse(x, y + 3, rx, ry).fill(0x2a2118);
      g.ellipse(x, y, rx, ry).fill(0x8b7355);
      g.ellipse(x, y - 1, rx - 4, ry - 2).fill(0xa38966);
    };
    platform(FOE_HOME.x, FOE_HOME.y - 2, 40, 9);
    platform(PLAYER_HOME.x, PLAYER_HOME.y - 2, 50, 11);
    c.addChild(g);
    return c;
  }

  /** SOLID Square: a marble hall at dusk, five lit arched windows between fluted columns, purple banners, a checker floor. */
  private solidSquareBackdrop(): Container {
    const c = new Container();
    const g = new Graphics();
    // back wall: deep indigo with a lighter cornice
    g.rect(0, 0, STAGE_W, 96).fill(0x2a2447);
    for (let y = 0; y < 96; y += 12) g.rect(0, y, STAGE_W, 1).fill(0x332c56); // ashlar courses
    g.rect(0, 0, STAGE_W, 8).fill(0x4a3f73).rect(0, 8, STAGE_W, 2).fill(0x6a5d9a);
    // five arched windows with a warm evening glow (one per principle)
    for (let i = 0; i < 5; i++) {
      const x = 14 + i * 50, top = 20;
      g.rect(x, top + 8, 22, 50).fill(0xffd98a).circle(x + 11, top + 8, 11).fill(0xffd98a);
      g.rect(x + 3, top + 12, 16, 46).fill(0xffeab0).circle(x + 11, top + 10, 8).fill(0xffeab0);
      g.rect(x + 10, top + 2, 2, 56).fill(0x6a5d9a).rect(x, top + 30, 22, 2).fill(0x6a5d9a); // mullion and transom
      g.rect(x - 2, top + 58, 26, 3).fill(0x8a7fb8); // sill
    }
    // fluted marble columns between the windows
    for (let i = 0; i < 6; i++) {
      const x = 2 + i * 50;
      g.rect(x - 2, 10, 12, 5).fill(0xd8d2e8).rect(x - 1, 15, 10, 76).fill(0xe8e4f4);
      for (let fx = x; fx < x + 9; fx += 3) g.rect(fx, 15, 1, 76).fill(0xc4bedb);
      g.rect(x - 1, 15, 2, 76).fill(0xf8f6ff);
      g.rect(x - 3, 91, 14, 5).fill(0xd8d2e8);
    }
    // purple banners hanging in front of every other column, with a gold diamond
    for (const bx of [52, 152, 252 - 2]) {
      if (bx > STAGE_W - 8) continue;
      g.rect(bx - 6, 16, 12, 40).fill(0x6a2f86).rect(bx - 6, 16, 2, 40).fill(0x8a4aa8);
      g.poly([bx - 6, 56, bx + 6, 56, bx, 64]).fill(0x6a2f86);
      g.poly([bx, 24, bx + 4, 30, bx, 36, bx - 4, 30]).fill(0xe8b933).poly([bx, 27, bx + 2, 30, bx, 33, bx - 2, 30]).fill(0xfff0a0);
    }
    // checker floor: cream and slate marble, rows darken towards the viewer
    g.rect(0, 96, STAGE_W, STAGE_H - 96).fill(0xcfc8e0);
    for (let row = 0, y = 96; y < STAGE_H; row++, y += 8) {
      for (let x = (row % 2) * 16; x < STAGE_W; x += 32) g.rect(x, y, 16, 8).fill(row > 3 ? 0x6c6490 : 0x8a82ad);
      g.rect(0, y, STAGE_W, 1).fill(0xa9a2c8);
    }
    g.rect(0, 96, STAGE_W, 2).fill(0xf0ecfa).rect(0, 98, STAGE_W, 1).fill(0x5c5483);
    // platforms: round marble dais with a gold rim
    const dais = (x: number, y: number, rx: number, ry: number) => {
      g.ellipse(x, y + 3, rx, ry).fill(0x3a3158);
      g.ellipse(x, y, rx, ry).fill(0xe8b933);
      g.ellipse(x, y, rx - 2, ry - 1).fill(0xf4efe0);
      g.ellipse(x, y - 1, rx - 6, ry - 3).fill(0xffffff);
    };
    dais(FOE_HOME.x, FOE_HOME.y - 2, 40, 9);
    dais(PLAYER_HOME.x, PLAYER_HOME.y - 2, 50, 11);
    c.addChild(g);
    return c;
  }

  /** Creational Foundry: a sooty brick works, glowing furnace mouths, girders and smokestacks, a conveyor and a steel plate floor. */
  private foundryBackdrop(): Container {
    const c = new Container();
    const g = new Graphics();
    // back wall: brick courses in dark red-brown
    g.rect(0, 0, STAGE_W, 96).fill(0x4a2220);
    for (let y = 0, row = 0; y < 96; y += 6, row++) {
      g.rect(0, y + 5, STAGE_W, 1).fill(0x2e1514);
      for (let x = (row % 2) * 12; x < STAGE_W; x += 24) g.rect(x, y, 1, 6).fill(0x2e1514);
      if (row % 3 === 1) for (let x = (row * 37) % 48; x < STAGE_W; x += 48) g.rect(x + 2, y + 1, 10, 4).fill(0x5e2c28);
    }
    g.rect(0, 0, STAGE_W, 10).fill(0x1f2330).rect(0, 10, STAGE_W, 2).fill(0x737b92); // roof beam
    // steel girders at the edges and between the furnaces
    for (const gx of [0, 82, 164, 236]) {
      g.rect(gx, 12, 10, 84).fill(0x33384a).rect(gx, 12, 2, 84).fill(0x737b92).rect(gx + 8, 12, 2, 84).fill(0x1f2330);
      for (let y = 18; y < 96; y += 12) g.rect(gx + 3, y, 4, 2).fill(0x97a3bc);
    }
    // three furnace mouths with a hot orange glow
    for (const fx of [22, 104, 186]) {
      const w = 48, top = 30;
      g.rect(fx - 3, top - 3, w + 6, 60).fill(0x1f2330).rect(fx, top, w, 57).fill(0x33384a);
      g.rect(fx + 4, top + 8, w - 8, 44).fill(0x2b1d1a);
      g.rect(fx + 6, top + 24, w - 12, 26).fill(0xa1270b).rect(fx + 10, top + 30, w - 20, 20).fill(0xf0661a).rect(fx + 16, top + 38, w - 32, 12).fill(0xffd35a);
      g.rect(fx + 4, top + 4, w - 8, 3).fill(0x737b92); // lintel
      for (let bx = fx + 12; bx < fx + w - 8; bx += 10) g.rect(bx, top + 8, 2, 16).fill(0x1f2330); // grate bars
    }
    // hanging pipe with a drip of molten metal above the foe's side
    g.rect(0, 14, STAGE_W, 4).fill(0x737b92).rect(0, 14, STAGE_W, 1).fill(0x97a3bc).rect(0, 17, STAGE_W, 1).fill(0x1f2330);
    // floor: steel diamond plate, darker towards the viewer, hazard stripe at the wall foot
    g.rect(0, 96, STAGE_W, STAGE_H - 96).fill(0x67718a);
    for (let row = 0, y = 100; y < STAGE_H; row++, y += 8) {
      g.rect(0, y, STAGE_W, 1).fill(row > 3 ? 0x2f3646 : 0x454d5c);
      for (let x = (row % 2) * 8; x < STAGE_W; x += 16) g.rect(x + 2, y + 3, 4, 1).fill(row > 3 ? 0x586177 : 0x97a3bc);
    }
    for (let x = 0; x < STAGE_W; x += 12) g.poly([x, 96, x + 6, 96, x + 3, 100, x - 3, 100]).fill(0xf0b429);
    g.rect(0, 96, STAGE_W, 1).fill(0x17121a).rect(0, 100, STAGE_W, 1).fill(0x17121a);
    // platforms: round steel turntables with a hazard-yellow rim
    const turntable = (x: number, y: number, rx: number, ry: number) => {
      g.ellipse(x, y + 3, rx, ry).fill(0x1f2330);
      g.ellipse(x, y, rx, ry).fill(0xf0b429);
      g.ellipse(x, y, rx - 2, ry - 1).fill(0x586177);
      g.ellipse(x, y - 1, rx - 6, ry - 3).fill(0x97a3bc);
    };
    turntable(FOE_HOME.x, FOE_HOME.y - 2, 40, 9);
    turntable(PLAYER_HOME.x, PLAYER_HOME.y - 2, 50, 11);
    c.addChild(g);
    return c;
  }

  /** Structural Bridges: a harbour at golden hour, a stone arch bridge and teal-roofed warehouses across the water, a plank quay floor with jetty platforms. */
  private bridgesBackdrop(): Container {
    const c = new Container();
    const g = new Graphics();
    // sky: warm bands from peach down to pale teal at the horizon
    const sky = [0xf6c28b, 0xf3b27f, 0xe9a27d, 0xd6a08c, 0xa9b4b8, 0x8ec3c0];
    sky.forEach((col, i) => g.rect(0, i * 16, STAGE_W, 16).fill(col));
    g.circle(206, 60, 11).fill(0xfff1c2).circle(206, 60, 7).fill(0xffffff);
    // far warehouses with teal roofs
    for (const [x, w, h] of [[6, 40, 24], [52, 30, 18], [176, 44, 26], [224, 32, 20]] as const) {
      const top = 72 - h;
      g.rect(x, top, w, h + 4).fill(0xe0cfaa).rect(x, top + 8, w, 1).fill(0xbda985);
      g.poly([x - 3, top, x + w + 3, top, x + w - 3, top - 8, x + 3, top - 8]).fill(0x3a8a80).rect(x - 3, top, w + 6, 2).fill(0x27534f);
      for (let wx = x + 5; wx < x + w - 5; wx += 9) g.rect(wx, top + 12, 4, 6).fill(0x2b2a3a).rect(wx, top + 12, 4, 1).fill(0xffd35a);
    }
    // harbour crane silhouette
    g.rect(160, 20, 3, 52).fill(0x33384a).rect(130, 20, 52, 3).fill(0xc4503f).rect(133, 23, 1, 18).fill(0x737b92).rect(131, 41, 5, 2).fill(0xf0b429);
    // the arch bridge: a stone deck with three arches over the water
    g.rect(52, 62, 152, 8).fill(0x8c96a6).rect(52, 62, 152, 2).fill(0xc0c8d6).rect(52, 70, 152, 1).fill(0x4c5563);
    for (let x = 52; x < 204; x += 4) g.rect(x, 62, 1, 8).fill(0x737b92);
    g.rect(52, 70, 152, 22).fill(0x6c7585);
    for (let y = 73; y < 92; y += 5) g.rect(52, y, 152, 1).fill(0x4c5563);
    for (const ax of [78, 128, 178]) {
      g.ellipse(ax, 92, 17, 17).fill(0x1f2330);
      g.ellipse(ax, 92, 14, 14).fill(0x1d4e7a);
      g.ellipse(ax, 92, 17, 17).stroke({ width: 2, color: 0xc0c8d6 });
    }
    g.rect(0, 92, STAGE_W, 4).fill(0x2f78a8); // waterline strip behind the floor
    // floor: a plank quay in perspective, darker boards towards the viewer, mooring line along the wall foot
    g.rect(0, 96, STAGE_W, STAGE_H - 96).fill(0xb07f45);
    for (let row = 0, y = 96; y < STAGE_H; row++, y += 8) {
      g.rect(0, y, STAGE_W, 1).fill(row > 3 ? 0x4a301e : 0x7a5230);
      for (let x = (row % 2) * 16; x < STAGE_W; x += 32) g.rect(x, y, 1, 8).fill(row > 3 ? 0x4a301e : 0x7a5230);
      for (let x = (row * 13) % 32; x < STAGE_W; x += 32) g.rect(x + 4, y + 3, 2, 1).fill(row > 3 ? 0x7a5230 : 0xd2a463);
    }
    g.rect(0, 96, STAGE_W, 2).fill(0xc0c8d6).rect(0, 98, STAGE_W, 1).fill(0x14161f);
    // platforms: round mooring pads with a teal rim
    const pad = (x: number, y: number, rx: number, ry: number) => {
      g.ellipse(x, y + 3, rx, ry).fill(0x2b1d1a);
      g.ellipse(x, y, rx, ry).fill(0x3a8a80);
      g.ellipse(x, y, rx - 2, ry - 1).fill(0x8c96a6);
      g.ellipse(x, y - 1, rx - 6, ry - 3).fill(0xc0c8d6);
    };
    pad(FOE_HOME.x, FOE_HOME.y - 2, 40, 9);
    pad(PLAYER_HOME.x, PLAYER_HOME.y - 2, 50, 11);
    c.addChild(g);
    return c;
  }

  private update(dt: number): void {
    if (this.frozen > 0) {
      this.frozen -= dt;
      return;
    }
    for (const t of this.tweens.slice()) {
      t.t = Math.min(t.dur, t.t + dt);
      t.fn(t.t / t.dur);
      if (t.t >= t.dur) {
        this.tweens.splice(this.tweens.indexOf(t), 1);
        t.done();
      }
    }
    this.player.update(dt);
    this.foe.update(dt);
    if (this.shake > 0.05) {
      this.root.position.set(this.baseX + (Math.random() - 0.5) * this.shake * 2, this.baseY + (Math.random() - 0.5) * this.shake * 2);
      this.shake *= 0.85;
    } else this.root.position.set(this.baseX, this.baseY);
  }

  private tween(dur: number, fn: (k: number) => void): Promise<void> {
    return new Promise((res) => this.tweens.push({ t: 0, dur, fn, done: res }));
  }

  private wait(dur: number): Promise<void> {
    return this.tween(dur, () => {});
  }

  /** Fade in from black while both creatures slide onto their platforms. */
  async intro(): Promise<void> {
    await Promise.all([
      this.tween(0.8, (k) => {
        this.fade.alpha = 1 - ease(k);
        this.foe.x = FOE_HOME.x + 140 * (1 - ease(k));
        this.player.x = PLAYER_HOME.x - 140 * (1 - ease(k));
      }),
    ]);
  }

  private popNumber(text: string, x: number, y: number, color: number): void {
    const t = new Text({ text, style: { fontFamily: "monospace", fontSize: 14, fontWeight: "bold", fill: color, stroke: { color: 0x000000, width: 3 } }, resolution: 3 });
    t.anchor.set(0.5);
    t.position.set(x, y);
    this.fx.addChild(t);
    void this.tween(0.9, (k) => {
      t.y = y - 18 * ease(k);
      t.alpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    }).then(() => t.destroy());
  }

  private async hit(target: PixelSprite, home: { x: number; y: number }, dmg: number, pushX: number): Promise<void> {
    if (target === this.foe) sfx.hit();
    else sfx.hurt();
    this.frozen = 0.07; // hit-stop
    this.shake = Math.min(6, 2 + dmg / 6);
    this.popNumber(`-${dmg}`, home.x, home.y - 62, 0xffe066);
    void target.play("hurt");
    await this.tween(0.35, (k) => {
      target.flashAmount = k < 0.5 ? 1 - k * 2 : 0;
      target.x = home.x + pushX * Math.sin(k * Math.PI);
    });
    target.x = home.x;
  }

  /** The player's creature lunges at the foe for `dmg`. */
  async playerStrike(dmg: number): Promise<void> {
    void this.player.play("attack");
    await this.tween(0.28, (k) => {
      this.player.x = PLAYER_HOME.x + 46 * Math.sin(k * Math.PI);
      this.player.y = PLAYER_HOME.y - 26 * Math.sin(k * Math.PI);
    });
    this.player.position.set(PLAYER_HOME.x, PLAYER_HOME.y);
    await this.hit(this.foe, FOE_HOME, dmg, 10);
  }

  /** The foe's counter against the player's creature. */
  async foeStrike(dmg: number): Promise<void> {
    void this.foe.play("attack");
    await this.tween(0.28, (k) => {
      this.foe.x = FOE_HOME.x - 50 * Math.sin(k * Math.PI);
      this.foe.y = FOE_HOME.y + 28 * Math.sin(k * Math.PI);
    });
    this.foe.position.set(FOE_HOME.x, FOE_HOME.y);
    await this.hit(this.player, PLAYER_HOME, dmg, -10);
  }

  async faint(who: "foe" | "player"): Promise<void> {
    const s = who === "foe" ? this.foe : this.player;
    sfx.faint();
    await s.play("faint", false, true);
    await this.tween(0.5, (k) => (s.alpha = 1 - k));
  }

  /** Brief pause so a result reads before the explanation opens. */
  beat(seconds = 0.2): Promise<void> {
    return this.wait(seconds);
  }
}
