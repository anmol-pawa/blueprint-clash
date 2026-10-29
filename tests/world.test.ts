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
