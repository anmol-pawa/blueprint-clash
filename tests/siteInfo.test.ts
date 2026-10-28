import { describe, expect, it } from "vitest";
import { basePathed, PILLARS } from "@/lib/siteInfo";

describe("siteInfo", () => {
  it("has one LLD and one HLD pillar", () => {
    expect(PILLARS.map((p) => p.id).sort()).toEqual(["hld", "lld"]);
  });
  it("prefixes the base path exactly once", () => {
    expect(basePathed("/play", "/blueprint-clash")).toBe("/blueprint-clash/play");
    expect(basePathed("play", "")).toBe("/play");
  });
});
