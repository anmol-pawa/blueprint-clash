import { describe, expect, it } from "vitest";
import { advance, availableChoices, currentNode, startDialogue, validateScript, visibleText } from "@/lib/dialogue/dialogue";
import { SCRIPTS } from "@/lib/dialogue/scripts";
import { MAPS, MAP_LEGENDS, START } from "@/lib/world/maps";
import { type PlayerState, facingTarget, faceNpcToward, step, validateMaps, walkable } from "@/lib/world/world";

const start: PlayerState = { ...START };

describe("maps", () => {
  it("are valid", () => expect(validateMaps(MAPS, MAP_LEGENDS)).toEqual([]));
  it("start on a walkable tile", () => expect(walkable(MAPS[start.map], start.x, start.y)).toBe(true));
  it("reference only dialogue scripts that exist", () => {
    for (const m of Object.values(MAPS)) {
      for (const id of [...m.npcs.map((n) => n.dialogue), ...Object.values(m.signs)]) expect(SCRIPTS[id], `${m.id}: ${id}`).toBeDefined();
    }
  });
  it("every warp round-trips to a map that warps back", () => {
    for (const m of Object.values(MAPS)) for (const w of m.warps) expect(MAPS[w.to].warps.some((b) => b.to === m.id)).toBe(true);
  });
});

describe("step", () => {
  it("turns first, then moves", () => {
    const t = step(MAPS, { ...start, facing: "up" }, "left");
    expect(t.kind).toBe("turned");
    expect(t.state).toMatchObject({ x: 9, y: 4, facing: "left" });
    const m = step(MAPS, t.state, "left");
    expect(m.kind).toBe("moved");
    expect(m.state).toMatchObject({ x: 8, facing: "left" });
  });
  it("is blocked by water, walls and the map edge", () => {
    expect(step(MAPS, { map: "old-town", x: 8, y: 4, facing: "down" }, "down").kind).toBe("blocked");
    expect(step(MAPS, { map: "old-town", x: 4, y: 3, facing: "up" }, "up").kind).toBe("blocked");
    expect(step(MAPS, { map: "old-town", x: 0, y: 3, facing: "left" }, "left").kind).toBe("blocked");
  });
  it("is blocked by an NPC", () => {
    expect(step(MAPS, { map: "drafting-hall", x: 2, y: 5, facing: "right" }, "right").kind).toBe("blocked");
  });
  it("warps through the door and back through the mat", () => {
    const inside = step(MAPS, { map: "old-town", x: 9, y: 3, facing: "up" }, "up");
    expect(inside.kind).toBe("warped");
    expect(inside.state).toEqual({ map: "drafting-hall", x: 7, y: 7, facing: "up" });
    const out = step(MAPS, { map: "drafting-hall", x: 7, y: 7, facing: "down" }, "down");
    expect(out.state).toMatchObject({ map: "old-town", x: 9, y: 3, facing: "down" });
  });
  it("can reach the Drafting Hall door from the start by walking", () => {
    let p: PlayerState = { ...start };
    for (let i = 0; i < 4; i++) {
      const r = step(MAPS, p, "up");
      p = r.state;
      if (r.kind === "warped") break;
    }
    expect(p.map).toBe("drafting-hall");
  });
});

describe("SOLID Square", () => {
  it("is reached by walking south from Old Town and back", () => {
    let p: PlayerState = { map: "old-town", x: 10, y: 9, facing: "down" };
    for (let i = 0; i < 2; i++) p = step(MAPS, p, "down").state;
    expect(p).toEqual({ map: "solid-square", x: 10, y: 12, facing: "up" });
    p = step(MAPS, p, "down").state; // turn to face the gate
    expect(step(MAPS, p, "down")).toMatchObject({ kind: "warped", state: { map: "old-town", x: 10, y: 10 } });
  });
  it("opens the Principle Hall arch as a warp and returns to the plaza", () => {
    let p: PlayerState = { map: "solid-square", x: 9, y: 3, facing: "up" };
    const r = step(MAPS, p, "up");
    expect(r).toMatchObject({ kind: "warped", state: { map: "principle-hall", x: 6, y: 8 } });
    p = (r as { state: PlayerState }).state;
    for (let i = 0; i < 4; i++) p = step(MAPS, p, "up").state;
    expect(p).toMatchObject({ map: "principle-hall", x: 6, y: 4 });
    expect(facingTarget(MAPS, p)).toMatchObject({ kind: "npc", npc: { id: "marlow" } });
    expect(step(MAPS, { map: "principle-hall", x: 7, y: 8, facing: "down" }, "down")).toMatchObject({ kind: "warped", state: { map: "solid-square", x: 10, y: 3 } });
  });
  it("blocks the fountain with water", () => {
    expect(step(MAPS, { map: "solid-square", x: 8, y: 5, facing: "right" }, "right").kind).toBe("blocked");
  });
});

describe("Creational Foundry", () => {
  it("is reached through SOLID Square's east gate and back", () => {
    let p: PlayerState = { map: "solid-square", x: 18, y: 3, facing: "right" };
    const r = step(MAPS, p, "right");
    expect(r).toMatchObject({ kind: "warped", state: { map: "foundry", x: 1, y: 5 } });
    p = (r as { state: PlayerState }).state;
    p = step(MAPS, p, "left").state; // turn to face the gate
    expect(step(MAPS, p, "left")).toMatchObject({ kind: "warped", state: { map: "solid-square", x: 18, y: 3 } });
  });
  it("blocks the molten channel and reads the sign", () => {
    expect(step(MAPS, { map: "foundry", x: 5, y: 6, facing: "down" }, "down").kind).toBe("blocked");
    expect(facingTarget(MAPS, { map: "foundry", x: 1, y: 5, facing: "up" })).toMatchObject({ kind: "sign" });
  });
  it("has every warp landing on a walkable tile", () => {
    for (const m of Object.values(MAPS)) for (const w of m.warps) {
      const t = MAPS[w.to];
      expect(t.solid.includes(t.rows[w.toY][w.toX]), `${m.id}->${w.to} ${w.toX},${w.toY}`).toBe(false);
    }
  });
});

describe("Structural Bridges", () => {
  it("is reached through the Foundry's east gate and back", () => {
    let p: PlayerState = { map: "foundry", x: 18, y: 5, facing: "right" };
    const r = step(MAPS, p, "right");
    expect(r).toMatchObject({ kind: "warped", state: { map: "bridges", x: 1, y: 3 } });
    p = (r as { state: PlayerState }).state;
    p = step(MAPS, p, "left").state; // turn to face the gate
    expect(step(MAPS, p, "left")).toMatchObject({ kind: "warped", state: { map: "foundry", x: 18, y: 5 } });
  });
  it("lets the player cross the channel only by the bridge", () => {
    // west bank to east bank along the deck row
    let p: PlayerState = { map: "bridges", x: 7, y: 5, facing: "right" };
    for (let i = 0; i < 6; i++) {
      const r = step(MAPS, p, "right");
      expect(r.kind, `step ${i}`).toBe("moved");
      p = (r as { state: PlayerState }).state;
    }
    expect(p.x).toBe(13);
    // the channel is water above and below the deck
    expect(step(MAPS, { map: "bridges", x: 7, y: 4, facing: "right" }, "right").kind).toBe("blocked");
    expect(step(MAPS, { map: "bridges", x: 7, y: 7, facing: "right" }, "right").kind).toBe("blocked");
  });
  it("blocks the warehouse and reads the sign", () => {
    expect(step(MAPS, { map: "bridges", x: 4, y: 3, facing: "up" }, "up").kind).toBe("blocked");
    expect(facingTarget(MAPS, { map: "bridges", x: 18, y: 5, facing: "up" })).toMatchObject({ kind: "sign" });
  });
});

describe("interaction", () => {
  it("finds the NPC or sign being faced", () => {
    const t = facingTarget(MAPS, { map: "drafting-hall", x: 2, y: 5, facing: "right" });
    expect(t).toMatchObject({ kind: "npc", npc: { id: "ada" } });
    expect(facingTarget(MAPS, { map: "old-town", x: 1, y: 3, facing: "down" })).toEqual({ kind: "sign", dialogue: "sign-welcome" });
    expect(facingTarget(MAPS, { map: "drafting-hall", x: 6, y: 2, facing: "up" })).toEqual({ kind: "sign", dialogue: "chalkboard-uml" });
    expect(facingTarget(MAPS, { map: "old-town", x: 9, y: 4, facing: "down" })).toBeUndefined();
  });
  it("NPCs face the player", () => {
    const ada = MAPS["drafting-hall"].npcs[0];
    expect(faceNpcToward(ada, { map: "drafting-hall", x: 2, y: 5, facing: "right" }).facing).toBe("left");
  });
});

describe("dialogue", () => {
  it("all scripts are valid", () => {
    for (const s of Object.values(SCRIPTS)) expect(validateScript(s)).toEqual([]);
  });
  it("runs Ada's intro with a choice and sets flags", () => {
    let s = startDialogue(SCRIPTS["ada-intro"]);
    s = advance(advance(s)); // hello -> why -> ask
    expect(availableChoices(s)).toHaveLength(3);
    expect(advance(s)).toBe(s); // a choice node needs a choice
    expect(advance(s, 9)).toBe(s);
    s = advance(s, 1);
    expect(currentNode(s).text).toMatch(/instinct/);
    expect(s.flags.has("ada-change")).toBe(true);
    s = advance(advance(s)); // -> bye -> done
    expect(s.done).toBe(true);
    expect(s.flags.has("met-ada")).toBe(true);
  });
  it("hides choices whose required flags are missing and never mutates caller flags", () => {
    const script = {
      id: "t", start: "a",
      nodes: { a: { text: "?", choices: [{ text: "secret", requires: ["key"], next: "b" }, { text: "plain" }] }, b: { text: "!" } },
    };
    const given = new Set<string>();
    const s = startDialogue(script, given);
    expect(availableChoices(s).map((c) => c.text)).toEqual(["plain"]);
    expect(availableChoices(startDialogue(script, new Set(["key"])))).toHaveLength(2);
    advance(s, 0);
    expect(given.size).toBe(0);
  });
  it("validateScript flags dangling and unreachable nodes", () => {
    const errs = validateScript({ id: "x", start: "a", nodes: { a: { text: "", next: "zz" }, orphan: { text: "" } } });
    expect(errs.join("|")).toMatch(/missing node "zz"/);
    expect(errs.join("|")).toMatch(/orphan.*unreachable/);
  });
  it("typewriter reveals text over time without splitting emoji", () => {
    expect(visibleText("hello", 0)).toBe("");
    expect(visibleText("hello", 100, 20)).toBe("he");
    expect(visibleText("hello", 10_000)).toBe("hello");
    expect(visibleText("a😀b", 70, 20)).toBe("a");
    expect(visibleText("a😀b", 100, 20)).toBe("a😀");
  });
});

describe("Creational Foundry trainers", () => {
  it("places Dova and Bram on reachable walkable tiles with art and dialogue", async () => {
    const { WALKERS, PORTRAITS } = await import("@/game/sprites/characters");
    const f = MAPS["foundry"];
    const seen = new Set<string>(["1,5"]);
    const q: [number, number][] = [[1, 5]];
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (ny < 0 || ny >= f.rows.length || nx < 0 || nx >= f.rows[0].length || seen.has(k) || f.solid.includes(f.rows[ny][nx])) continue;
        seen.add(k);
        q.push([nx, ny]);
      }
    }
    for (const id of ["dova", "bram"]) {
      const npc = f.npcs.find((n) => n.id === id);
      expect(npc, id).toBeDefined();
      expect(f.solid.includes(f.rows[npc!.y][npc!.x])).toBe(false);
      expect(WALKERS.some((w) => w.id === id)).toBe(true);
      expect(PORTRAITS.some((p) => p.id === `${id}-portrait`)).toBe(true);
      expect(SCRIPTS[npc!.dialogue]).toBeDefined();
      const adjacent = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${npc!.x + dx},${npc!.y + dy}`));
      expect(adjacent, id).toBe(true);
    }
  });
});

describe("Structural Bridges trainers", () => {
  it("places Nerys and Tobin on the banks, reachable from the Foundry gate, with art and dialogue", async () => {
    const { WALKERS, PORTRAITS } = await import("@/game/sprites/characters");
    const m = MAPS["bridges"];
    // Flood fill from the gate landing; the plank bridge is the only way across the channel.
    const seen = new Set<string>(["1,3"]);
    const q: [number, number][] = [[1, 3]];
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (ny < 0 || ny >= m.rows.length || nx < 0 || nx >= m.rows[0].length || seen.has(k) || m.solid.includes(m.rows[ny][nx])) continue;
        seen.add(k);
        q.push([nx, ny]);
      }
    }
    for (const id of ["nerys", "tobin"]) {
      const npc = m.npcs.find((n) => n.id === id);
      expect(npc, id).toBeDefined();
      expect(m.solid.includes(m.rows[npc!.y][npc!.x])).toBe(false);
      expect(WALKERS.some((w) => w.id === id)).toBe(true);
      expect(PORTRAITS.some((p) => p.id === `${id}-portrait`)).toBe(true);
      expect(SCRIPTS[npc!.dialogue]).toBeDefined();
      const adjacent = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${npc!.x + dx},${npc!.y + dy}`));
      expect(adjacent, id).toBe(true);
    }
  });
});

describe("SOLID Square trainers", () => {
  it("places Sable and Rook on walkable plaza tiles with art and dialogue", async () => {
    const { WALKERS, PORTRAITS } = await import("@/game/sprites/characters");
    const sq = MAPS["solid-square"];
    for (const id of ["sable", "rook"]) {
      const npc = sq.npcs.find((n) => n.id === id);
      expect(npc, id).toBeDefined();
      expect(sq.solid.includes(sq.rows[npc!.y][npc!.x])).toBe(false);
      expect(WALKERS.some((w) => w.id === id)).toBe(true);
      expect(PORTRAITS.some((p) => p.id === `${id}-portrait`)).toBe(true);
    }
  });

describe("Foundry Hall", () => {
  it("opens the roller door as a warp, reaches Corvo, and returns to the yard", () => {
    let p: PlayerState = { map: "foundry", x: 9, y: 3, facing: "up" };
    const r = step(MAPS, p, "up");
    expect(r).toMatchObject({ kind: "warped", state: { map: "foundry-hall", x: 6, y: 8 } });
    p = (r as { state: PlayerState }).state;
    for (let i = 0; i < 4; i++) p = step(MAPS, p, "up").state;
    expect(p).toMatchObject({ map: "foundry-hall", x: 6, y: 4 });
    expect(facingTarget(MAPS, p)).toMatchObject({ kind: "npc", npc: { id: "corvo" } });
    expect(step(MAPS, { map: "foundry-hall", x: 7, y: 8, facing: "down" }, "down")).toMatchObject({ kind: "warped", state: { map: "foundry", x: 10, y: 3 } });
  });
});
});
