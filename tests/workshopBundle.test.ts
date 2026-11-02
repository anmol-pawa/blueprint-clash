import { describe, expect, it } from "vitest";
import { parseBlocks } from "@/components/Prose";
import { DRIVER } from "@/lib/judge/native";
import { judgeNative } from "@/lib/judge/native";
import { WORKSHOP_REGISTRY } from "@/content/workshop/registry";
import { expectedTestCount, hiddenFiles, providedFiles, toBundle, visibleRequirements } from "@/lib/workshop/bundle";
import { loadPackage, loadPackageWith, listProblems } from "@/lib/workshop/load";
import { knownRequirements } from "@/lib/workshop/flow";

describe("workshop bundle", () => {
  it("registry covers every problem on disk", async () => {
    expect(Object.keys(WORKSHOP_REGISTRY).sort()).toEqual(await listProblems());
  });

  it("the registry loader matches the path loader", async () => {
    const a = await loadPackage("library-management");
    const b = await loadPackageWith("library-management", WORKSHOP_REGISTRY["library-management"]);
    expect(b).toEqual(a);
  });

  it("hides a storm's header until the storm arrives, but keeps it on the include path", async () => {
    const b = toBundle(await loadPackage("library-management"), DRIVER);
    expect(b.phases).toEqual(["base", "storm1"]);
    expect(providedFiles(b, "base").map((f) => f.path)).toEqual(["api.h"]);
    expect(providedFiles(b, "storm1").map((f) => f.path)).toEqual(["api.h", "api_storm1.h"]);
    expect(hiddenFiles(b, "base").map((f) => f.path)).toContain("api_storm1.h");
    expect(hiddenFiles(b, "storm1").map((f) => f.path)).not.toContain("api_storm1.h");
    // no path appears both in the tree and in the hidden set
    for (const p of b.phases) {
      const shown = new Set(providedFiles(b, p).map((f) => f.path));
      expect(hiddenFiles(b, p).filter((f) => shown.has(f.path))).toEqual([]);
    }
  });

  it("storm tests are cumulative and the expected count matches a real run", async () => {
    const pkg = await loadPackage("library-management");
    const b = toBundle(pkg, DRIVER);
    expect(expectedTestCount(b, "storm1")).toBeGreaterThan(expectedTestCount(b, "base"));
    const files = [...providedFiles(b, "storm1"), ...hiddenFiles(b, "storm1"), ...b.reference.map((f) => ({ path: f.path, content: f.content }))];
    const r = await judgeNative(files, { noExceptions: true });
    expect(r.verdict).toBe("accepted");
    expect(r.summary.tests.length).toBe(expectedTestCount(b, "storm1"));
  });

  it("only shows requirements the player has uncovered", async () => {
    const b = toBundle(await loadPackage("library-management"), DRIVER);
    const none = visibleRequirements(b, "storm1", knownRequirements(b.requirements, b.clarify, [])).map((r) => r.id);
    expect(none).not.toContain("R-tier");
    expect(none).not.toContain("R-limit");
    const asked = visibleRequirements(b, "storm1", knownRequirements(b.requirements, b.clarify, ["q-tiers", "q-limit"])).map((r) => r.id);
    expect(asked).toContain("R-tier");
    expect(asked).toContain("R-limit");
  });
});

describe("Prose parser", () => {
  it("parses headings, lists, paragraphs and code fences", () => {
    const blocks = parseBlocks("# T\n\nsome **text**\nmore\n\n- a\n- b\n\n1. x\n2. y\n\n```\ncode\n```\n");
    expect(blocks.map((x) => x.kind)).toEqual(["h", "p", "ul", "ol", "code"]);
    expect(blocks[1]).toEqual({ kind: "p", text: "some **text** more" });
    expect(blocks[2]).toEqual({ kind: "ul", items: ["a", "b"] });
  });
});
