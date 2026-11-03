import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { basePathed, PILLARS, PLAYABLE_MODES } from "@/lib/siteInfo";

describe("siteInfo", () => {
  it("has one LLD and one HLD pillar", () => {
    expect(PILLARS.map((p) => p.id).sort()).toEqual(["hld", "lld"]);
  });
  it("every playable mode points at a built route", () => {
    for (const m of PLAYABLE_MODES) {
      const dir = m.href.split("?")[0].replace(/^\//, "").replace(/^workshop\/.*/, "workshop/[id]");
      expect(existsSync(`app/${dir}/page.tsx`), m.href).toBe(true);
    }
  });
  it("prefixes the base path exactly once", () => {
    expect(basePathed("/play", "/blueprint-clash")).toBe("/blueprint-clash/play");
    expect(basePathed("play", "")).toBe("/play");
  });
});
