import { Application, Container, Graphics } from "pixi.js";
import { EVOLUTION_TOTAL, evolutionFrame, type EvolutionFrame } from "@/lib/battle/evolution";
import type { SpriteDef } from "@/game/sprites/pixel";
import { PixelSprite } from "@/game/sprites/texture";
import { STAGE_H, STAGE_W } from "./BattleStage";

/**
 * The evolution scene. All timing comes from `evolutionFrame(t)`; this class
 * only draws it: a night-sky backdrop, a platform, the old and new sprites
 * (one visible at a time), a glow behind the creature and burst rays.
 */
export class EvolutionStage {
  private app = new Application();
  private root = new Container();
  private from!: PixelSprite;
  private to!: PixelSprite;
  private glow = new Graphics();
  private rays = new Graphics();
  private t = 0;
  private destroyed = false;
  private last: EvolutionFrame = evolutionFrame(0);

  constructor(
    private host: HTMLElement,
    private fromDef: SpriteDef,
    private toDef: SpriteDef,
    private onFrame: (f: EvolutionFrame) => void,
  ) {}

  async init(): Promise<void> {
    await this.app.init({ resizeTo: this.host, background: "#070d1f", antialias: false, roundPixels: true });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    this.host.appendChild(this.app.canvas);
    this.app.canvas.style.imageRendering = "pixelated";
    this.app.stage.addChild(this.root);
    this.root.addChild(this.backdrop(), this.glow, this.rays);
    this.from = new PixelSprite(this.fromDef, 1);
    this.to = new PixelSprite(this.toDef, 1);
    const home = { x: STAGE_W / 2, y: 112 };
    this.from.position.set(home.x, home.y);
    this.to.position.set(home.x, home.y);
    this.root.addChild(this.from, this.to);
    this.app.ticker.add((tk) => this.update(tk.deltaMS / 1000));
    this.app.renderer.on("resize", () => this.layout());
    this.layout();
    this.draw();
  }

  /** Jump to the end (Skip / reduced motion). */
  skip(): void {
    this.t = EVOLUTION_TOTAL;
  }

  /** Current timeline position in seconds (for tests / debugging). */
  get time(): number {
    return this.t;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.app.renderer) this.app.destroy(true, { children: true });
  }

  private layout(): void {
    const { width, height } = this.app.screen;
    const s = Math.min(width / STAGE_W, height / STAGE_H);
    this.root.scale.set(s);
    this.root.position.set((width - STAGE_W * s) / 2, (height - STAGE_H * s) / 2);
  }

  private backdrop(): Container {
    const c = new Container();
    const g = new Graphics();
    [0x070d1f, 0x0d1a3a, 0x15284f, 0x1f3a6b].forEach((col, i) => g.rect(0, i * 28, STAGE_W, 28).fill(col));
    for (let i = 0; i < 28; i++) {
      const x = (i * 97) % STAGE_W;
      const y = (i * 53) % 80;
      g.rect(x, y, 1, 1).fill(i % 4 === 0 ? 0xfff2b0 : 0x8fa8d8);
    }
    g.rect(0, 112, STAGE_W, STAGE_H - 112).fill(0x2a2118);
    g.rect(0, 112, STAGE_W, 2).fill(0x4a3b2c);
    g.ellipse(STAGE_W / 2, 114, 58, 11).fill(0x1a140e);
    g.ellipse(STAGE_W / 2, 111, 58, 11).fill(0x8b7355);
    g.ellipse(STAGE_W / 2, 110, 52, 9).fill(0xa38966);
    c.addChild(g);
    return c;
  }

  private update(dt: number): void {
    this.t = Math.min(EVOLUTION_TOTAL, this.t + dt);
    this.from.update(dt);
    this.to.update(dt);
    this.draw();
  }

  private draw(): void {
    const f = evolutionFrame(this.t);
    this.last = f;
    const showTo = f.form === "to";
    this.from.visible = !showTo;
    this.to.visible = showTo;
    const active = showTo ? this.to : this.from;
    active.flashAmount = f.white;
    active.scale.set(f.pulse);
    const cx = STAGE_W / 2;
    const cy = 112 - 36;
    this.glow.clear();
    if (f.glow > 0) {
      for (let i = 4; i >= 1; i--) this.glow.circle(cx, cy, 20 + i * 14 * (0.5 + f.glow * 0.7)).fill({ color: 0xbfe6ff, alpha: 0.06 * f.glow * (5 - i) });
    }
    this.rays.clear();
    if (f.rays > 0) {
      const len = 20 + f.rays * 150;
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + f.rays * 0.6;
        const w = 0.09 * (1 - f.rays * 0.5);
        this.rays
          .poly([cx, cy, cx + Math.cos(a - w) * len, cy + Math.sin(a - w) * len, cx + Math.cos(a + w) * len, cy + Math.sin(a + w) * len])
          .fill({ color: 0xffffff, alpha: 0.75 * (1 - f.rays) });
      }
    }
    this.onFrame(f);
  }

  get frame(): EvolutionFrame {
    return this.last;
  }
}
